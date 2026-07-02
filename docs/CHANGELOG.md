# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- ARCHITECTURE.md with system overview and Mermaid diagrams for project structure understanding
- Hook Impact section to diagnostics.html for visibility into pre-commit hook performance metrics
- Auto-generated documentation for all dashboard pages via auto-docs system

### Changed
- Bump formula to v1.0.1
- Fix projects page: detectPrefix use .path not .name
- Auto-detect path prefix instead of hardcoding /Users/pghose/
- Update README with Homebrew install instructions
- Fix formula SHA256 checksum
- Fix formula: correct GitHub username and real SHA256
- Updated all dashboard HTML pages (cost, efficiency, models, optimizer, patterns, projects, index) with enhanced styling, navigation, and data visualization
- Corrected documentation URLs, dependencies list, and ccusage explanation for accuracy

## [0.1.0] - 2025-02-01

### Added
- Initial 8-page Claude Code spending dashboard with comprehensive cost tracking and analysis
- cost.html: Cost breakdown by project, model, and time period for spend visibility
- efficiency.html: Efficiency metrics and cost-per-task analysis to optimize usage
- models.html: Model-specific performance and cost comparison data
- optimizer.html: Recommendations for cost optimization and usage patterns
- patterns.html: Usage trend analysis and behavioral insights
- projects.html: Per-project spending and resource allocation tracking
- index.html: Main dashboard overview with key metrics and navigation
- diagnostics.html with Hook Impact section: System health monitoring and hook performance metrics

### Changed
- Updated multiple dashboard pages (cost, efficiency, models, optimizer, patterns, projects) with enhanced data visualization and navigation
