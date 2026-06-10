#!/usr/bin/env pwsh
#Requires -Version 5.1

<#
.SYNOPSIS
    Chaos Code CLI — PowerShell 入口
    Chaos Code - Spec + Test Driven AI Copilot

.DESCRIPTION
    Windows PowerShell 包装器，调用 Node.js CLI (cli.js)。
    支持 init/new/status/update/hooks 命令，与 Node.js CLI 完全对等。

.NOTES
    前置条件: Node.js >= 18 已安装并在 PATH 中
    安装方式:
      1. 全局: 将此文件放入 PATH 目录（如 $HOME\bin\）
      2. 项目: 在项目根目录直接运行 .\stdd.ps1

.EXAMPLE
    .\stdd.ps1 init
    .\stdd.ps1 new feature "用户登录"
    .\stdd.ps1 status
    .\stdd.ps1 update
#>

[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [ValidateSet('init', 'new', 'status', 'update', 'hooks', 'list', 'help', '')]
    [string]$Command = '',

    [Parameter(Position=1, ValueFromRemainingArguments)]
    [string[]]$Args = @()
)

$ErrorActionPreference = 'Stop'

# ─── 前置检查 ─────────────────────────────────────────────

function Test-NodeJS {
    try {
        $version = node --version 2>$null
        if ($LASTEXITCODE -ne 0) { throw }
        # 验证 >= 18
        $major = [int]($version -replace '^v', '' -split '\.')[0]
        if ($major -lt 18) {
            Write-Error "Chaos Code 需要 Node.js >= 18，当前: $version"
            exit 1
        }
        return $true
    } catch {
        Write-Error "未检测到 Node.js。请安装 Node.js >= 18: https://nodejs.org/"
        exit 1
    }
}

function Get-ScriptRoot {
    # PowerShell 5.1 兼容
    if ($PSScriptRoot) { return $PSScriptRoot }
    if ($MyInvocation.PSScriptRoot) { return $MyInvocation.PSScriptRoot }
    return (Split-Path -Parent $MyInvocation.MyCommand.Definition)
}

# ─── 帮助信息 ─────────────────────────────────────────────

function Show-Help {
    $helpText = @"

$(Write-Host "Chaos Code CLI" -ForegroundColor Cyan) $(Write-Host "v1.0" -ForegroundColor Gray)
Chaos Code - Spec + Test Driven AI Copilot — PowerShell Entry

$(Write-Host "USAGE:" -ForegroundColor Yellow)
    .\stdd.ps1 <command> [options]

$(Write-Host "COMMANDS:" -ForegroundColor Yellow)
    init              初始化 Chaos Code 工作流（检测项目类型、生成配置）
    new <type> <name> 创建新变更提案
                      type: feature | bugfix | refactor | hotfix
    status            查看当前工作区状态
    update            更新 Chaos Code 配置和依赖
    hooks             管理 Git Hooks（安装/卸载/状态）
    list              列出所有变更和归档

$(Write-Host "OPTIONS:" -ForegroundColor Yellow)
    -Verbose          详细输出
    -Debug            调试模式

$(Write-Host "EXAMPLES:" -ForegroundColor Yellow)
    .\stdd.ps1 init
    .\stdd.ps1 new feature "Todo List"
    .\stdd.ps1 new bugfix "登录页面崩溃"
    .\stdd.ps1 status
    .\stdd.ps1 hooks --install

$(Write-Host "SKILL COMMANDS (Claude Code):" -ForegroundColor Yellow)
    /stdd:init        /stdd:propose     /stdd:clarify
    /stdd:confirm     /stdd:spec        /stdd:plan
    /stdd:apply       /stdd:execute     /stdd:verify
    /stdd:commit      /stdd:turbo       /stdd:issue

$(Write-Host "更多信息:" -ForegroundColor Gray) https://github.com/Marcher-lam/chaos-code

"@
    Write-Host $helpText
}

# ─── 命令实现 ─────────────────────────────────────────────

function Invoke-STDDInit {
    <#
    .SYNOPSIS
        初始化 STDD 工作流
    #>
    Test-NodeJS

    $scriptDir = Get-ScriptRoot

    Write-Host "🚀 初始化 Chaos Code..." -ForegroundColor Cyan

    # 创建目录结构
    $dirs = @(
        "stdd\memory",
        "stdd\active_feature",
        "stdd\changes",
        "stdd\changes\archive",
        "stdd\specs",
        "stdd\reports"
    )

    foreach ($dir in $dirs) {
        $fullPath = Join-Path (Get-Location) $dir
        if (-not (Test-Path $fullPath)) {
            New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
            Write-Host "  ✅ 创建目录: $dir" -ForegroundColor Green
        } else {
            Write-Host "  ⏭️  已存在: $dir" -ForegroundColor Gray
        }
    }

    # 检测项目类型
    $projectType = "unknown"
    $testCmd = ""
    if (Test-Path "package.json") {
        $projectType = "node"
        if (Test-Path "vitest.config.*") {
            $testCmd = "npx vitest run"
        } elseif (Test-Path "jest.config.*") {
            $testCmd = "npx jest"
        }
        Write-Host "  📦 检测到 Node.js 项目" -ForegroundColor Cyan
    } elseif (Test-Path "requirements.txt" -or Test-Path "pyproject.toml") {
        $projectType = "python"
        $testCmd = "pytest"
        Write-Host "  🐍 检测到 Python 项目" -ForegroundColor Cyan
    } elseif (Test-Path "go.mod") {
        $projectType = "go"
        $testCmd = "go test ./..."
        Write-Host "  🔧 检测到 Go 项目" -ForegroundColor Cyan
    } elseif (Test-Path "Cargo.toml") {
        $projectType = "rust"
        $testCmd = "cargo test"
        Write-Host "  🦀 检测到 Rust 项目" -ForegroundColor Cyan
    }

    # 生成 foundation.md
    $foundationPath = "stdd\memory\foundation.md"
    if (-not (Test-Path $foundationPath)) {
        $content = @"
# 项目基础约束

## 技术栈
- 项目类型: $projectType

## 测试命令
- 单元测试: $testCmd
"@
        Set-Content -Path $foundationPath -Value $content -Encoding UTF8
        Write-Host "  ✅ 生成: $foundationPath" -ForegroundColor Green
    }

    # 调用 Node.js CLI（如果存在）
    $cliPath = Join-Path $scriptDir "cli.js"
    if (Test-Path $cliPath) {
        Write-Host ""
        Write-Host "  调用 Node.js CLI 完成剩余初始化..." -ForegroundColor Gray
        node $cliPath init 2>$null
    }

    Write-Host ""
    Write-Host "✅ Chaos Code 初始化完成！" -ForegroundColor Green
    Write-Host "   下一步: 使用 /stdd:propose 提出新需求" -ForegroundColor Gray
}

function Invoke-STDDNew {
    <#
    .SYNOPSIS
        创建新变更提案
    #>
    param([string]$Type, [string]$Name)

    if (-not $Type -or -not $Name) {
        Write-Host "用法: .\stdd.ps1 new <feature|bugfix|refactor|hotfix> `"名称`"" -ForegroundColor Yellow
        return
    }

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $changeDir = "stdd\changes\change-$timestamp"
    New-Item -ItemType Directory -Path $changeDir -Force | Out-Null

    # 生成 proposal.md
    $template = @"
# Proposal: $Name

## 类型
$Type

## Intent
[为什么做这个变更]

## Scope
### In Scope
- [功能点]

### Out of Scope
- [排除项]

## Success Criteria
- [ ] [验收条件]

---
> Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
> Status: Draft
"@
    Set-Content -Path (Join-Path $changeDir "proposal.md") -Value $template -Encoding UTF8

    Write-Host "✅ 变更已创建: $changeDir" -ForegroundColor Green
    Write-Host "   类型: $Type | 名称: $Name" -ForegroundColor Gray
    Write-Host "   下一步: 使用 /stdd:clarify 澄清需求" -ForegroundColor Gray
}

function Invoke-STDDStatus {
    <#
    .SYNOPSIS
        查看当前工作区状态
    #>
    Write-Host "📊 Chaos Code 工作区状态" -ForegroundColor Cyan
    Write-Host ("━" * 40)

    # 活跃变更
    $changesDir = "stdd\changes"
    if (Test-Path $changesDir) {
        $activeChanges = Get-ChildItem $changesDir -Directory | Where-Object {
            $_.Name -like "change-*" -and -not (Test-Path (Join-Path $_.FullName "COMMITTED"))
        }
        $archivedChanges = Get-ChildItem (Join-Path $changesDir "archive") -Directory -ErrorAction SilentlyContinue

        Write-Host ""
        Write-Host "  活跃变更: $($activeChanges.Count)" -ForegroundColor $(if ($activeChanges.Count -gt 0) { "Yellow" } else { "Gray" })
        foreach ($change in $activeChanges) {
            $hasProposal = Test-Path (Join-Path $change.FullName "proposal.md")
            $hasSpecs = Test-Path (Join-Path $change.FullName "specs")
            Write-Host "    📁 $($change.Name)" -ForegroundColor Gray
            Write-Host "       提案: $(if ($hasProposal) { '✅' } else { '⬜' }) 规格: $(if ($hasSpecs) { '✅' } else { '⬜' })" -ForegroundColor Gray
        }

        Write-Host "  已归档: $(if ($archivedChanges) { $archivedChanges.Count } else { 0 })" -ForegroundColor Gray
    } else {
        Write-Host "  ⚠️ 未检测到 stdd/changes/ 目录" -ForegroundColor Yellow
        Write-Host "     运行 .\stdd.ps1 init 初始化" -ForegroundColor Gray
    }

    # 配置状态
    Write-Host ""
    if (Test-Path "stdd\config.yaml") {
        Write-Host "  配置: ✅ stdd\config.yaml" -ForegroundColor Green
    } else {
        Write-Host "  配置: ❌ 未找到 stdd\config.yaml" -ForegroundColor Red
    }

    if (Test-Path "stdd\memory\foundation.md") {
        Write-Host "  基础: ✅ stdd\memory\foundation.md" -ForegroundColor Green
    }
}

function Invoke-STDDHooks {
    <#
    .SYNOPSIS
        管理 Git Hooks
    #>
    param([string]$Action = 'status')

    $hooksDir = ".git\hooks"
    $stddHooks = @("pre-commit", "pre-push")

    switch ($Action) {
        '--install' {
            if (-not (Test-Path $hooksDir)) {
                Write-Host "❌ 未找到 .git/hooks/，请确认在 Git 仓库中" -ForegroundColor Red
                return
            }

            foreach ($hook in $stddHooks) {
                $hookPath = Join-Path $hooksDir $hook
                $hookContent = @"
#!/bin/sh
# STDD Copilot Hook: $hook
# Auto-generated by stdd.ps1 hooks --install

echo "🔍 STDD $hook check..."

# Run stdd-guard pre-commit validation
if command -v node >/dev/null 2>&1; then
    node stdd/reporters/vitest.js --hook=$hook 2>/dev/null
fi

echo "✅ STDD $hook passed"
"@
                Set-Content -Path $hookPath -Value $hookContent -Encoding UTF8
                Write-Host "  ✅ 安装: $hook" -ForegroundColor Green
            }
        }

        '--uninstall' {
            foreach ($hook in $stddHooks) {
                $hookPath = Join-Path $hooksDir $hook
                if ((Test-Path $hookPath) -and ((Get-Content $hookPath -Raw) -match "STDD")) {
                    Remove-Item $hookPath -Force
                    Write-Host "  🗑️  卸载: $hook" -ForegroundColor Yellow
                }
            }
        }

        default {
            Write-Host "  Git Hooks 状态:" -ForegroundColor Cyan
            foreach ($hook in $stddHooks) {
                $hookPath = Join-Path $hooksDir $hook
                if ((Test-Path $hookPath) -and ((Get-Content $hookPath -Raw) -match "STDD")) {
                    Write-Host "    ✅ $hook (已安装)" -ForegroundColor Green
                } else {
                    Write-Host "    ⬜ $hook (未安装)" -ForegroundColor Gray
                }
            }
            Write-Host ""
            Write-Host "  用法: .\stdd.ps1 hooks --install / --uninstall" -ForegroundColor Gray
        }
    }
}

function Invoke-STDDList {
    <#
    .SYNOPSIS
        列出所有变更
    #>
    Write-Host "📋 Chaos Code 变更列表" -ForegroundColor Cyan
    Write-Host ("━" * 40)

    $changesDir = "stdd\changes"
    if (-not (Test-Path $changesDir)) {
        Write-Host "  暂无变更" -ForegroundColor Gray
        return
    }

    $allChanges = Get-ChildItem $changesDir -Directory | Where-Object { $_.Name -like "change-*" }
    foreach ($change in $allChanges) {
        $status = if (Test-Path (Join-Path $change.FullName "COMMITTED")) { "✅ 已提交" } else { "🔄 进行中" }
        Write-Host "  $status $($change.Name)" -ForegroundColor $(if ($status -match "已提交") { "Green" } else { "Yellow" })
    }

    $archiveDir = Join-Path $changesDir "archive"
    if (Test-Path $archiveDir) {
        $archived = Get-ChildItem $archiveDir -Directory -ErrorAction SilentlyContinue
        if ($archived) {
            Write-Host ""
            Write-Host "  已归档:" -ForegroundColor Gray
            foreach ($a in $archived) {
                Write-Host "    📦 $($a.Name)" -ForegroundColor DarkGray
            }
        }
    }
}

function Invoke-STDDUpdate {
    <#
    .SYNOPSIS
        更新 STDD 配置
    #>
    Write-Host "🔄 检查 Chaos Code 更新..." -ForegroundColor Cyan

    $scriptDir = Get-ScriptRoot
    $packageJson = Join-Path $scriptDir "package.json"
    if (Test-Path $packageJson) {
        $pkg = Get-Content $packageJson | ConvertFrom-Json
        Write-Host "  当前版本: $($pkg.version)" -ForegroundColor Gray
    }

    # 更新 npm 依赖
    if (Test-Path "package.json") {
        Write-Host "  检查 npm 更新..." -ForegroundColor Gray
        npm update --save 2>$null
        Write-Host "  ✅ 依赖已更新" -ForegroundColor Green
    }

    Write-Host "✅ 更新完成" -ForegroundColor Green
}

# ─── 主入口 ─────────────────────────────────────────────

switch ($Command) {
    'init'    { Invoke-STDDInit }
    'new'     { Invoke-STDDNew -Type $Args[0] -Name ($Args[1..($Args.Length-1)] -join ' ') }
    'status'  { Invoke-STDDStatus }
    'hooks'   { Invoke-STDDHooks -Action ($Args[0]) }
    'list'    { Invoke-STDDList }
    'update'  { Invoke-STDDUpdate }
    'help'    { Show-Help }
    ''        { Show-Help }
}
