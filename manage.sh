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
# 前置检查
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

# ============================================================
# 初始化环境
# ============================================================
cmd_init() {
  info "初始化 xiaohongshu-ops 环境..."

  # 生成 .env
  if [[ ! -f .env ]]; then
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
    warn ".env 已存在，跳过"
  fi

  # 创建必要目录
  mkdir -p volumes/api
  mkdir -p volumes/db
  mkdir -p public/uploads

  # 检查 Kong 配置
  if [[ ! -f volumes/api/kong.yml ]]; then
    err "缺少 volumes/api/kong.yml，请确保项目文件完整"
    exit 1
  fi

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
  compose pull --ignore-buildable

  info "构建应用镜像..."
  compose build app mcp

  info "启动所有服务..."
  compose up -d

  echo ""
  log "所有服务已启动！"
  echo ""
  cmd_status
  echo ""
  info "首次启动可能需要 30-60 秒等待数据库初始化"
  info "应用地址:       http://localhost:3000"
  info "MCP Server:     http://localhost:3002/mcp"
  info "Supabase Studio: http://localhost:80/studio/"
  info "Supabase API:    http://localhost:8000"
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
  info "拉取最新代码..."
  git pull origin main

  info "重新构建应用和 MCP..."
  compose build app mcp --no-cache

  info "重启应用和 MCP（零停机）..."
  compose up -d --no-deps app mcp

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
  for svc in db kong auth rest storage meta studio app mcp; do
    local status
    status=$(compose ps --format "{{.Status}}" "$svc" 2>/dev/null || echo "not found")
    if echo "$status" | grep -qi "up\|healthy"; then
      log "$svc: ${GREEN}运行中${NC}"
    else
      err "$svc: ${RED}${status}${NC}"
      all_ok=false
    fi
  done

  echo ""

  # 检查端口
  info "端口检查:"
  for port in 3000 8000 80; do
    if curl -sf -o /dev/null -w '' "http://localhost:${port}" 2>/dev/null; then
      log "localhost:${port} ✓"
    else
      warn "localhost:${port} ✗ (可能还在启动中)"
      all_ok=false
    fi
  done

  echo ""
  if $all_ok; then
    log "所有服务正常 🎉"
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

${YELLOW}基础命令:${NC}
  init        初始化环境（生成 .env、创建目录）
  start       启动所有服务
  stop        停止所有服务
  restart     重启所有服务
  status      查看服务状态
  health      健康检查

${YELLOW}开发命令:${NC}
  update      拉取最新代码并重新部署
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
  db, kong, auth, rest, storage, meta, studio, app, mcp, nginx

${YELLOW}示例:${NC}
  ./manage.sh init          # 首次部署
  ./manage.sh start         # 启动
  ./manage.sh logs app      # 查看应用日志
  ./manage.sh db backup     # 备份数据库
  ./manage.sh update        # 更新部署
EOF
}

# ============================================================
# 入口
# ============================================================
cmd="${1:-help}"
shift 2>/dev/null || true

case "$cmd" in
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
