---
description: Built-in browser automation (Playwright)
---

# Command: /stdd:browser

## Usage
```
chaos browser snapshot <url>      # Take screenshot
chaos browser inspect <url>       # Inspect page
chaos browser doctor              # Browser health check
chaos browser --width=1920        # Set viewport width
chaos browser --height=1080       # Set viewport height
```

## Description
Built-in browser automation using Playwright for E2E testing, screenshots, and page inspection.

## Execution Flow
1. Launch Playwright browser
2. Navigate to URL or perform action
3. Capture screenshot or inspect DOM
4. Save results to output directory

## Output
- Screenshots (PNG)
- Inspection results (JSON)
- Diagnostic reports
