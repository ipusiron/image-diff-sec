# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **client-side web application for image comparison and security analysis**. It's a simple, static website that requires no build process or dependencies.

- **Language**: Vanilla JavaScript, HTML, CSS
- **Type**: Frontend-only web application
- **Purpose**: Security tool for detecting image tampering, QR code modifications, and document forgery

## Development Commands

Since this is a static website with no build system:

- **Run locally**: Open `index.html` directly in a browser or serve with any static web server (e.g., `python -m http.server`)
- **No build/compile step required**
- **No tests or linting configured**

## Architecture

The entire application consists of three files:

1. **index.html** - UI structure with file upload inputs and canvas elements
2. **style.css** - Modern, clean styling
3. **script.js** - Core comparison logic using Canvas API

### Core Algorithm (script.js)

The image comparison works by:
1. Loading both images into canvas elements using `FileReader.readAsDataURL()`
2. Extracting pixel data using `getImageData()` which returns RGBA values as Uint8ClampedArray
3. Comparing RGB values pixel-by-pixel (iterating with `i += 4` through the array)
4. Creating a diff image with differences highlighted in red (RGB: 255, 0, 0)
5. Calculating percentage based on total changed pixels

**Important**: Images must have identical dimensions for comparison to work.

#### Canvas API Methods Used

- `getContext("2d")`: Creates 2D rendering context
- `drawImage()`: Renders image onto canvas
- `getImageData()`: Extracts pixel data (RGBA values)
- `createImageData()`: Creates new ImageData object for diff
- `putImageData()`: Renders pixel data back to canvas
- `clearRect()`: Clears canvas area

## Key Implementation Notes

- Uses HTML5 Canvas API for all image manipulation
- No external dependencies or frameworks
- All processing happens client-side (no server communication)
- Security-focused: designed for detecting subtle image modifications
- UI text is primarily in Japanese

### Technical Limitations

- **Image Size**: Both images must have identical dimensions (width and height)
- **File Types**: Supports any image format the browser can render (JPEG, PNG, GIF, WebP, etc.)
- **Memory Usage**: Large images may consume significant memory (approximately 4 bytes per pixel × 3 canvases)
- **CORS**: Cannot load images from external domains due to Canvas security restrictions

### Performance Considerations

- **Large Images**: Performance degrades linearly with image resolution
- **Memory Requirements**: A 4K image (3840×2160) requires approximately 100MB+ of memory per image
- **Recommended Limits**: For optimal performance, keep images under 10 megapixels

### Browser Compatibility

- Requires browsers supporting Canvas 2D Context API, FileReader API, and ImageData API
- Minimum versions: Chrome 6+, Firefox 3.6+, Safari 5+, Edge 12+

### Error Handling

The application validates:
- File selection before processing
- Image loading completion
- Matching image dimensions
- Provides user feedback via browser alerts

## Sample Images

The `samples/` directory contains test images demonstrating:
- QR code tampering detection (`qr_legit.png` vs `qr_fake.png`)
- Document forgery detection (`doc_original.png` vs `doc_edited.png`)
- Marketing material changes (`flyer_before.png` vs `flyer_after.png`)

## Context

Part of the "Day021 - 生成AIで作るセキュリティツール100" project - a 100-day challenge creating security tools with AI assistance.