#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# xiaohongshu-ops 一键管理脚本
# 用法: ./manage.sh [命令]
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; }
info() { echo -e "${CYAN}[→]${NC} $*"; }

# ============================================================
# 工具函数
# ============================================================
check_deps() {
  local missing=()
  command -v docker &>/dev/null || missing+=(docker)
  command -v docker compose &>/dev/null 2>&1 || command -v docker-compose &>/dev/null || missing+=(docker-compose)
  if [[ ${#missing[@]} -gt 0 ]]; then
    err "缺少依赖: ${missing[*]}"
    err "请先安装 Docker: https://docs.docker.com/engine/install/"
    exit 1
  fi
}

compose() {
  if docker compose version &>/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

# 从 .env 读取变量值
get_env_var() {
  local key="$1"
  local default="${2:-}"
  if [[ -f .env ]]; then
    local val
    val=$(grep -E "^${key}=" .env 2>/dev/null | head -1 | cut -d= -f2-)
    echo "${val:-$default}"
  else
    echo "$default"
  fi
}

# 等待所有服务健康
wait_healthy() {
  local timeout=${1:-120}
  local elapsed=0
  local spinner='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'

  while [ $elapsed -lt $timeout ]; do
    local all_ok=true
    local waiting_for=""
    local ready=0
    local total=0

    while IFS=$'\t' read -r name status; do
      [ -z "$name" ] && continue
      total=$((total + 1))

      if echo "$status" | grep -q "(healthy)"; then
        ready=$((ready + 1))
      elif echo "$status" | grep -q "(health:"; then
        all_ok=false
        waiting_for="${waiting_for:+$waiting_for, }$name"
      elif echo "$status" | grep -qi "^Up"; then
        ready=$((ready + 1))
      else
        all_ok=false
        waiting_for="${waiting_for:+$waiting_for, }$name"
      fi
    done < <(compose ps --format "{{.Name}}\t{{.Status}}" 2>/dev/null)

    if [ $total -eq 0 ]; then
      sleep 2
      elapsed=$((elapsed + 2))
      continue
    fi

    if $all_ok; then
      printf "\r  ✓ 所有服务已就绪 (%d/%d)                              \n" "$ready" "$total"
      return 0
    fi

    local i=$((elapsed / 5 % ${#spinner}))
    printf "\r  ${spinner:$i:1} 等待服务就绪 (%d/%d) [%ds/%ds] 等待: %s          " \
      "$ready" "$total" "$elapsed" "$timeout" "$waiting_for"

    sleep 5
    elapsed=$((elapsed + 5))
  done

  printf "\n"
  return 1
}

# 校验 .env 关键变量
check_env() {
  [[ ! -f .env ]] && return

  local warnings=0

  if grep -q "^POSTGRES_PASSWORD=your-super-secret-and-long-postgres-password$" .env 2>/dev/null; then
    warn "POSTGRES_PASSWORD 仍为默认值，请修改！"
    warnings=$((warnings + 1))
  fi
  if grep -q "^JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long$" .env 2>/dev/null; then
    warn "JWT_SECRET 仍为默认值，请修改！"
    warnings=$((warnings + 1))
  fi
  if grep -q "^API_AUTH_TOKEN=your-api-auth-token-here$" .env 2>/dev/null; then
    warn "API_AUTH_TOKEN 仍为默认值，请修改！"
    warnings=$((warnings + 1))
  fi
  if grep -q "^PG_META_CRYPTO_KEY=your-encryption-key-32-chars-min$" .env 2>/dev/null; then
    warn "PG_META_CRYPTO_KEY 仍为默认值，请修改！"
    warnings=$((warnings + 1))
  fi

  if [ $warnings -gt 0 ]; then
    warn "以上变量使用默认值，生产环境请务必修改 .env"
  fi
}

# 显示访问地址
show_access_info() {
  local app_port nginx_port kong_port mcp_port
  app_port=$(get_env_var APP_PORT 3001)
  nginx_port=$(get_env_var NGINX_PORT 8080)
  kong_port=$(get_env_var KONG_HTTP_PORT 8001)
  mcp_port=$(get_env_var MCP_PORT 3002)

  echo ""
  echo -e "${CYAN}━━━ 访问地址 ━━━${NC}"
  info "应用:            http://localhost:${app_port}"
  info "Nginx 入口:      http://localhost:${nginx_port}"
  info "MCP Server:      http://localhost:${mcp_port}/mcp"
  info "Supabase Studio: http://localhost:${nginx_port}/studio/"
  info "Supabase API:    http://localhost:${kong_port}"
}

# ============================================================
# 一键安装
# ============================================================
cmd_install() {
  info "一键安装 xiaohongshu-ops..."
  echo ""

  # 1. 检查依赖
  check_deps

  # 2. 生成 .env
  if [[ ! -f .env ]]; then
    if [[ -f .env.example ]]; then
      info "生成 .env 配置文件..."
      cp .env.example .env

      # 生成随机密钥
      local pg_pass jwt_secret api_token meta_key
      pg_pass=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
      jwt_secret=$(openssl rand -base64 32)
      api_token=$(openssl rand -hex 32)
      meta_key=$(openssl rand -hex 16)

      # 替换默认值
      sed -i.bak "s|your-super-secret-and-long-postgres-password|${pg_pass}|g" .env
      sed -i.bak "s|your-super-secret-jwt-token-with-at-least-32-characters-long|${jwt_secret}|g" .env
      sed -i.bak "s|your-api-auth-token-here|${api_token}|g" .env
      sed -i.bak "s|your-encryption-key-32-chars-min|${meta_key}|g" .env
      rm -f .env.bak

      log "已生成 .env（所有密钥已随机生成）"
      warn "默认使用 Supabase Demo 的 ANON_KEY 和 SERVICE_ROLE_KEY"
      warn "生产环境请用你自己的 JWT_SECRET 重新生成 API Keys"
    else
      err "缺少 .env.example，请手动创建 .env 文件"
      exit 1
    fi
  else
    warn ".env 已存在，跳过生成"
    check_env
  fi

  # 3. 创建数据目录
  mkdir -p volumes/db/data
  mkdir -p volumes/storage

  # 4. 拉取镜像
  info "拉取镜像..."
  compose pull

  # 5. 启动
  info "启动所有服务..."
  compose up -d

  # 6. 等待健康
  info "等待服务就绪（最长 120 秒）..."
  if wait_healthy 120; then
    log "安装完成！"
  else
    warn "部分服务未就绪，请查看日志: ./manage.sh logs"
  fi

  # 7. 显示状态和访问地址
  echo ""
  cmd_status
  show_access_info
}

# ============================================================
# 卸载
# ============================================================
cmd_uninstall() {
  check_deps
  echo -e "${RED}━━━ 卸载 xiaohongshu-ops ━━━${NC}"
  warn "即将停止并删除所有容器和网络"
  echo ""
  read -rp "确认卸载? (输入 YES): " confirm
  if [[ "$confirm" != "YES" ]]; then
    warn "已取消"
    return
  fi

  # 停止并删除容器和网络
  info "停止并删除容器..."
  compose down --remove-orphans
  log "容器已删除"

  # 询问是否删除数据卷
  echo ""
  read -rp "是否同时删除数据（volumes/ 目录和 Docker 数据卷）? (y/N): " del_data
  if [[ "$del_data" =~ ^[Yy]$ ]]; then
    rm -rf volumes/
    docker volume rm xiaohongshu-ops_db-config 2>/dev/null || true
    log "数据已删除"
  else
    info "保留数据目录"
  fi

  # 询问是否删除 .env
  echo ""
  read -rp "是否删除 .env 配置文件? (y/N): " del_env
  if [[ "$del_env" =~ ^[Yy]$ ]]; then
    rm -f .env
    log ".env 已删除"
  else
    info "保留 .env"
  fi

  # 询问是否清理镜像
  echo ""
  read -rp "是否清理相关 Docker 镜像? (y/N): " del_images
  if [[ "$del_images" =~ ^[Yy]$ ]]; then
    local images
    images=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(xiaohongshu-ops|supabase)" || true)
    if [[ -n "$images" ]]; then
      echo "$images" | xargs docker rmi 2>/dev/null || true
      log "镜像已清理"
    else
      info "未找到相关镜像"
    fi
  else
    info "保留镜像"
  fi

  echo ""
  log "卸载完成"
}

# ============================================================
# 初始化环境
# ============================================================
cmd_init() {
  info "初始化 xiaohongshu-ops 环境..."

  # 生成 .env
  if [[ ! -f .env ]]; then
    if [[ -f .env.example ]]; then
      info "生成 .env 配置文件..."
      cp .env.example .env

      # 生成随机密码和密钥
      local pg_pass
      pg_pass=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
      local jwt_secret
      jwt_secret=$(openssl rand -base64 32)

      # 替换默认值
      sed -i.bak "s|your-super-secret-and-long-postgres-password|${pg_pass}|g" .env
      sed -i.bak "s|your-super-secret-jwt-token-with-at-least-32-characters-long|${jwt_secret}|g" .env
      rm -f .env.bak

      log "已生成 .env（PostgreSQL 密码和 JWT 密钥已随机生成）"
      warn "默认使用 Supabase Demo 的 ANON_KEY 和 SERVICE_ROLE_KEY"
      warn "生产环境请用你自己的 JWT_SECRET 重新生成 API Keys"
    else
      err "缺少 .env.example，请手动创建 .env 文件"
      exit 1
    fi
  else
    warn ".env 已存在，跳过"
  fi

  # 创建数据目录
  mkdir -p volumes/db/data
  mkdir -p volumes/storage

  log "初始化完成！"
  echo ""
  info "下一步: ./manage.sh start"
}

# ============================================================
# 启动
# ============================================================
cmd_start() {
  check_deps
  [[ ! -f .env ]] && cmd_init

  info "拉取镜像..."
  compose pull

  info "启动所有服务..."
  compose up -d

  info "等待服务就绪..."
  if wait_healthy 120; then
    log "所有服务已启动！"
  else
    warn "部分服务未就绪，请查看日志: ./manage.sh logs"
  fi

  echo ""
  cmd_status
  show_access_info
}

# ============================================================
# 停止
# ============================================================
cmd_stop() {
  check_deps
  info "停止所有服务..."
  compose down
  log "已停止"
}

# ============================================================
# 重启
# ============================================================
cmd_restart() {
  cmd_stop
  cmd_start
}

# ============================================================
# 状态
# ============================================================
cmd_status() {
  check_deps
  echo -e "${CYAN}━━━ xiaohongshu-ops 服务状态 ━━━${NC}"
  compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
}

# ============================================================
# 日志
# ============================================================
cmd_logs() {
  check_deps
  local service="${1:-}"
  if [[ -n "$service" ]]; then
    compose logs -f --tail=100 "$service"
  else
    compose logs -f --tail=50
  fi
}

# ============================================================
# 更新部署
# ============================================================
cmd_update() {
  check_deps

  # 1. 备份数据库
  info "备份数据库..."
  local backup_file="backup_update_$(date +%Y%m%d_%H%M%S).sql"
  if compose exec -T db pg_isready -U postgres -h localhost &>/dev/null; then
    if compose exec -T db pg_dump -U postgres --clean > "$backup_file" 2>/dev/null; then
      log "数据库已备份: ${backup_file}"
    else
      warn "数据库备份失败，继续更新..."
      rm -f "$backup_file"
    fi
  else
    warn "数据库未运行，跳过备份"
  fi

  # 2. 拉取最新镜像
  info "拉取最新镜像..."
  compose pull

  # 3. 重建服务
  info "重启服务..."
  compose up -d

  # 4. 等待健康
  info "等待服务就绪..."
  if wait_healthy 120; then
    log "服务已就绪"
  else
    warn "部分服务未就绪，请查看日志: ./manage.sh logs"
  fi

  # 5. 数据库迁移
  info "检查数据库迁移..."
  local has_migrations=false
  for f in supabase/migrations/*.sql; do
    if [[ -f "$f" ]]; then
      has_migrations=true
      info "执行: $(basename "$f")"
      compose exec -T db psql -U postgres -d "${POSTGRES_DB:-postgres}" < "$f" 2>/dev/null || \
        warn "迁移 $(basename "$f") 执行失败（可能已执行过）"
    fi
  done
  if $has_migrations; then
    log "迁移完成"
  else
    info "无待执行的迁移"
  fi

  # 6. 显示状态
  echo ""
  cmd_status
  show_access_info
  echo ""
  log "更新完成！"
}

# ============================================================
# 仅重启应用（不动数据库）
# ============================================================
cmd_reload() {
  check_deps
  info "重启应用服务..."
  compose restart app mcp nginx
  log "应用已重启"
}

# ============================================================
# 数据库操作
# ============================================================
cmd_db() {
  check_deps
  local subcmd="${1:-shell}"
  case "$subcmd" in
    shell)
      info "连接数据库..."
      compose exec db psql -U postgres
      ;;
    migrate)
      info "执行数据库迁移..."
      for f in supabase/migrations/*.sql; do
        if [[ -f "$f" ]]; then
          info "执行: $(basename "$f")"
          compose exec -T db psql -U postgres -d "${POSTGRES_DB:-postgres}" < "$f"
        fi
      done
      log "迁移完成"
      ;;
    backup)
      local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
      info "备份数据库到 ${backup_file}..."
      compose exec -T db pg_dump -U postgres --clean > "$backup_file"
      log "备份完成: ${backup_file}"
      ;;
    restore)
      local file="${2:-}"
      if [[ -z "$file" ]]; then
        err "用法: ./manage.sh db restore <backup.sql>"
        exit 1
      fi
      if [[ ! -f "$file" ]]; then
        err "文件不存在: $file"
        exit 1
      fi
      warn "即将从 ${file} 恢复数据库，这会覆盖现有数据！"
      read -rp "确认继续? (y/N) " confirm
      if [[ "$confirm" =~ ^[Yy]$ ]]; then
        compose exec -T db psql -U postgres < "$file"
        log "恢复完成"
      else
        warn "已取消"
      fi
      ;;
    *)
      err "未知数据库命令: $subcmd"
      echo "可用: shell, migrate, backup, restore"
      ;;
  esac
}

# ============================================================
# 清理（危险）
# ============================================================
cmd_clean() {
  check_deps
  warn "这将删除所有容器、数据卷和上传文件！"
  read -rp "确认继续? (输入 YES): " confirm
  if [[ "$confirm" == "YES" ]]; then
    compose down -v --remove-orphans
    rm -rf public/uploads/*
    log "已清理所有数据"
  else
    warn "已取消"
  fi
}

# ============================================================
# 健康检查
# ============================================================
cmd_health() {
  check_deps
  echo -e "${CYAN}━━━ 健康检查 ━━━${NC}"

  local all_ok=true

  # 检查各服务
  for svc in db kong auth rest storage imgproxy meta studio app mcp nginx; do
    local status
    status=$(compose ps --format "{{.Status}}" "$svc" 2>/dev/null || echo "not found")
    if echo "$status" | grep -q "(healthy)"; then
      log "$svc: ${GREEN}healthy${NC}"
    elif echo "$status" | grep -q "(health:"; then
      warn "$svc: ${YELLOW}启动中${NC}"
      all_ok=false
    elif echo "$status" | grep -qi "^Up"; then
      log "$svc: ${GREEN}运行中${NC}"
    else
      err "$svc: ${RED}${status}${NC}"
      all_ok=false
    fi
  done

  echo ""

  # 检查端口 - 从 .env 读取
  local app_port nginx_port kong_port mcp_port
  app_port=$(get_env_var APP_PORT 3001)
  nginx_port=$(get_env_var NGINX_PORT 8080)
  kong_port=$(get_env_var KONG_HTTP_PORT 8001)
  mcp_port=$(get_env_var MCP_PORT 3002)

  info "端口检查:"
  for port in "$app_port" "$kong_port" "$nginx_port"; do
    if curl -s -o /dev/null --connect-timeout 2 "http://localhost:${port}" 2>/dev/null; then
      log "localhost:${port} ✓"
    else
      warn "localhost:${port} ✗ (可能还在启动中)"
      all_ok=false
    fi
  done

  # MCP 端口检查
  if curl -s -o /dev/null --connect-timeout 2 "http://localhost:${mcp_port}/mcp" 2>/dev/null; then
    log "localhost:${mcp_port}/mcp ✓"
  else
    warn "localhost:${mcp_port}/mcp ✗ (可能还在启动中)"
    all_ok=false
  fi

  echo ""
  if $all_ok; then
    log "所有服务正常"
  else
    warn "部分服务异常，请查看日志: ./manage.sh logs"
  fi
}

# ============================================================
# 帮助
# ============================================================
cmd_help() {
  cat <<EOF
${CYAN}━━━ xiaohongshu-ops 管理脚本 ━━━${NC}

${GREEN}用法:${NC} ./manage.sh <命令> [参数]

${YELLOW}快速开始:${NC}
  install     一键安装（首次部署推荐）
  uninstall   完整卸载

${YELLOW}基础命令:${NC}
  init        初始化环境（生成 .env、创建目录）
  start       启动所有服务
  stop        停止所有服务
  restart     重启所有服务
  status      查看服务状态
  health      健康检查

${YELLOW}开发命令:${NC}
  update      拉取最新镜像并重新部署（自动备份 + 迁移）
  reload      仅重启应用（不动数据库）
  logs [服务]  查看日志（可指定服务名）

${YELLOW}数据库:${NC}
  db shell    连接数据库 CLI
  db migrate  执行 SQL 迁移
  db backup   备份数据库
  db restore <file>  从备份恢复

${YELLOW}维护:${NC}
  clean       清理所有数据（⚠️ 危险）

${YELLOW}服务名:${NC}
  db, kong, auth, rest, storage, imgproxy, meta, studio, app, mcp, nginx

${YELLOW}示例:${NC}
  ./manage.sh install         # 一键安装（首次）
  ./manage.sh start           # 启动
  ./manage.sh logs app        # 查看应用日志
  ./manage.sh db backup       # 备份数据库
  ./manage.sh update          # 更新部署
  ./manage.sh uninstall       # 完整卸载
EOF
}

# ============================================================
# 入口
# ============================================================
cmd="${1:-help}"
shift 2>/dev/null || true

case "$cmd" in
  install)   cmd_install ;;
  uninstall) cmd_uninstall ;;
  init)    cmd_init ;;
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_restart ;;
  status)  cmd_status ;;
  logs)    cmd_logs "$@" ;;
  update)  cmd_update ;;
  reload)  cmd_reload ;;
  db)      cmd_db "$@" ;;
  health)  cmd_health ;;
  clean)   cmd_clean ;;
  help|-h|--help) cmd_help ;;
  *)
    err "未知命令: $cmd"
    cmd_help
    exit 1
    ;;
esac
