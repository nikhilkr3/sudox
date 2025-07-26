document.addEventListener("DOMContentLoaded", function () {
  const randomBtn = document.getElementById("randomBtn");
  const gridSizeSelect = document.getElementById("gridSize");
  const gridContainer = document.getElementById("gridContainer");
  const messageEl = document.getElementById("message");
  const downloadBtn = document.getElementById("downloadBtn");

  // Define symbols and block dimensions
  const symbols = {
    9: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    12: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C"],
    16: [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
    ],
  };

  const blockDims = {
    9: { rows: 3, cols: 3 },
    12: { rows: 3, cols: 4 },
    16: { rows: 4, cols: 4 },
  };

  let currentGrid = [];
  let currentSize = 0;

  randomBtn.addEventListener("click", function () {
    currentSize = parseInt(gridSizeSelect.value);
    const solution = generateValidGrid(currentSize);
    if (currentSize === 12 || currentSize === 16) {
      currentGrid = createSymmetricPuzzle(solution, currentSize);
    } else {
      currentGrid = createPuzzleFromGrid(solution, currentSize); // 9x9 non-symmetric
    }
    renderGrid(currentGrid, currentSize);
    gridContainer.classList.remove("hidden");
    validateBtn.classList.remove("hidden");
    downloadBtn.classList.remove("hidden");
    messageEl.textContent = "";
  });

  downloadBtn.addEventListener("click", function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const puzzle = currentGrid;
    const size = currentSize;

    const n1 = {
      9: "Nona",
      12: "Doza",
      16: "Hexa",
    }[size];

    const cellSize = 10; // Size of each cell in mm
    const startX = 20; // Left margin
    const startY = 30; // Top margin

    doc.setFontSize(12);
    doc.text(`Sudoku ${n1} Puzzle (${size}x${size})`, startX, startY - 10);

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const x = startX + col * cellSize;
        const y = startY + row * cellSize;

        // Draw square
        doc.rect(x, y, cellSize, cellSize);

        const val = puzzle[row][col];
        if (val !== "") {
          doc.text(val, x + cellSize / 2 - 2, y + cellSize / 2 + 3); // Adjust text position
        }
      }
    }

    // Optional: Thicker lines for block borders
    const block = blockDims[size];
    const gridSize = size * cellSize;
    doc.setLineWidth(1); // Thicker line for blocks

    for (let i = 0; i <= size; i++) {
      // Vertical thick lines
      if (i % block.cols === 0) {
        const x = startX + i * cellSize;
        doc.line(x, startY, x, startY + gridSize);
      }

      // Horizontal thick lines
      if (i % block.rows === 0) {
        const y = startY + i * cellSize;
        doc.line(startX, y, startX + gridSize, y);
      }
    }

    doc.save(`sudoku_${size}x${size}.pdf`);
  });

  function generateValidGrid(size) {
    const dims = blockDims[size];
    let grid;
    let attempts = 0;
    const maxAttempts = 100;

    // Try multiple times to generate a valid grid
    while (attempts < maxAttempts) {
      grid = Array(size)
        .fill()
        .map(() => Array(size).fill(""));
      const syms = symbols[size];

      // Fill diagonal blocks first
      for (let br = 0; br < size; br += dims.rows) {
        for (let bc = 0; bc < size; bc += dims.cols) {
          if (br === bc) {
            // Diagonal blocks only
            fillBlock(
              grid,
              br,
              bc,
              dims.rows,
              dims.cols,
              shuffleArray([...syms])
            );
          }
        }
      }

      // Try to fill remaining cells
      if (fillRemaining(grid, 0, dims.rows, dims.cols, size)) {
        if (validateGrid(grid, size)) {
          return grid;
        }
      }
      attempts++;
    }

    // Fallback - may have duplicates but won't freeze
    return generateSimpleGrid(size, dims);
  }

  function fillRemaining(grid, index, blockRows, blockCols, size) {
    if (index >= size * size) return true;

    const row = Math.floor(index / size);
    const col = index % size;

    if (grid[row][col] !== "") {
      return fillRemaining(grid, index + 1, blockRows, blockCols, size);
    }

    const syms = shuffleArray([...symbols[size]]);
    for (const sym of syms) {
      if (isValidPlacement(grid, row, col, sym, blockRows, blockCols, size)) {
        grid[row][col] = sym;
        if (fillRemaining(grid, index + 1, blockRows, blockCols, size)) {
          return true;
        }
        grid[row][col] = "";
      }
    }

    return false;
  }

  function isValidPlacement(grid, row, col, sym, blockRows, blockCols, size) {
    // Check row
    for (let c = 0; c < size; c++) {
      if (grid[row][c] === sym) return false;
    }

    // Check column
    for (let r = 0; r < size; r++) {
      if (grid[r][col] === sym) return false;
    }

    // Check block
    const blockRow = Math.floor(row / blockRows) * blockRows;
    const blockCol = Math.floor(col / blockCols) * blockCols;

    for (let r = 0; r < blockRows; r++) {
      for (let c = 0; c < blockCols; c++) {
        if (grid[blockRow + r][blockCol + c] === sym) {
          return false;
        }
      }
    }

    return true;
  }

  function generateSimpleGrid(size, dims) {
    const grid = Array(size)
      .fill()
      .map(() => Array(size).fill(""));
    const syms = symbols[size];

    // Just fill blocks with shuffled symbols (no row/col checks)
    for (let br = 0; br < size; br += dims.rows) {
      for (let bc = 0; bc < size; bc += dims.cols) {
        fillBlock(grid, br, bc, dims.rows, dims.cols, shuffleArray([...syms]));
      }
    }
    return grid;
  }

  function validateGrid(grid, size) {
    const dims = blockDims[size];

    // Check all rows
    for (let row = 0; row < size; row++) {
      const rowValues = new Set();
      for (let col = 0; col < size; col++) {
        const val = grid[row][col];
        if (val === "" || rowValues.has(val)) return false;
        rowValues.add(val);
      }
    }

    // Check all columns
    for (let col = 0; col < size; col++) {
      const colValues = new Set();
      for (let row = 0; row < size; row++) {
        const val = grid[row][col];
        if (val === "" || colValues.has(val)) return false;
        colValues.add(val);
      }
    }

    // Check all blocks
    for (let br = 0; br < size; br += dims.rows) {
      for (let bc = 0; bc < size; bc += dims.cols) {
        const blockValues = new Set();
        for (let r = 0; r < dims.rows; r++) {
          for (let c = 0; c < dims.cols; c++) {
            const val = grid[br + r][bc + c];
            if (val === "" || blockValues.has(val)) return false;
            blockValues.add(val);
          }
        }
      }
    }

    return true;
  }

  function fillBlock(grid, startRow, startCol, rows, cols, values) {
    let index = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid[startRow + r][startCol + c] = values[index++];
      }
    }
  }

  function renderGrid(grid, size) {
    gridContainer.innerHTML = "";
    const dims = blockDims[size];
    gridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    const validSymbols = symbols[size];

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const cell = document.createElement("div");
        cell.className = "grid-cell";

        const blockRow = Math.floor(row / dims.rows);
        const blockCol = Math.floor(col / dims.cols);
        cell.classList.add(
          (blockRow + blockCol) % 2 === 0 ? "light-blue" : "white"
        );

        const value = grid[row][col];

        if (value !== "") {
          const span = document.createElement("span");
          span.textContent = value;
          span.classList.add("fixed");
          cell.appendChild(span);
        } else {
          const input = document.createElement("input");
          input.setAttribute("type", "text");
          input.setAttribute("maxlength", "1");
          input.classList.add("input-cell");
          input.dataset.row = row;
          input.dataset.col = col;

          // Validate input
          input.addEventListener("input", (e) => {
            let val = e.target.value.toUpperCase();
            if (!validSymbols.includes(val)) {
              e.target.value = "";
            } else {
              e.target.value = val;
            }
          });

          document.querySelectorAll(".input-cell").forEach((input) => {
            input.addEventListener("keydown", (e) => {
              const row = parseInt(input.dataset.row);
              const col = parseInt(input.dataset.col);

              const getInput = (r, c) =>
                document.querySelector(
                  `input[data-row="${r}"][data-col="${c}"]`
                );

              let target = null;

              const tryMove = (dr, dc) => {
                let r = row + dr;
                let c = col + dc;
                while (r >= 0 && r < currentSize && c >= 0 && c < currentSize) {
                  const candidate = getInput(r, c);
                  if (candidate) return candidate;
                  r += dr;
                  c += dc;
                }
                return null;
              };

              const fallback = (dr, dc) => {
                // Start from the opposite edge
                let r, c;
                if (dr === -1)
                  r = currentSize - 1; // ArrowUp - start from bottom
                else if (dr === 1) r = 0; // ArrowDown - start from top
                else r = row;

                if (dc === -1)
                  c = currentSize - 1; // ArrowLeft - start from right
                else if (dc === 1) c = 0; // ArrowRight - start from left
                else c = col;

                return getInput(r, c);
              };

              switch (e.key) {
                case "ArrowUp":
                  target = tryMove(-1, 0) || fallback(-1, 0);
                  break;
                case "ArrowDown":
                  target = tryMove(1, 0) || fallback(1, 0);
                  break;
                case "ArrowLeft":
                  target = tryMove(0, -1) || fallback(0, -1);
                  break;
                case "ArrowRight":
                  target = tryMove(0, 1) || fallback(0, 1);
                  break;
              }

              if (target) {
                e.preventDefault();
                target.focus();
              }
            });
          });

          cell.appendChild(input);
        }

        gridContainer.appendChild(cell);
      }
    }
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function createPuzzleFromGrid(grid, size) {
    const puzzle = Array(size)
      .fill()
      .map(() => Array(size).fill(""));
    const block = blockDims[size];

    const maxCluesPerUnit = {
      9: 4,
      12: 5,
      16: 7,
    }[size];

    const totalClueLimit = {
      9: 27,
      12: 48,
      16: 86,
    }[size];

    const rowClues = Array(size).fill(0);
    const colClues = Array(size).fill(0);
    const blockClues = Array(size).fill(0);

    const allPositions = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        allPositions.push({ row: r, col: c });
      }
    }

    shuffleArray(allPositions);

    let placedClues = 0;

    for (const { row, col } of allPositions) {
      if (placedClues >= totalClueLimit) break;

      const blockIndex = getBlockIndex(row, col, block, size);

      if (
        rowClues[row] < maxCluesPerUnit &&
        colClues[col] < maxCluesPerUnit &&
        blockClues[blockIndex] < maxCluesPerUnit
      ) {
        puzzle[row][col] = grid[row][col];
        rowClues[row]++;
        colClues[col]++;
        blockClues[blockIndex]++;
        placedClues++;
      }
    }

    return puzzle;
  }

  function createSymmetricPuzzle(grid, size) {
    const puzzle = Array(size)
      .fill()
      .map(() => Array(size).fill(""));
    const block = blockDims[size];

    const maxCluesPerUnit = size === 12 ? 6 : 8;
    const totalClueLimit = size === 12 ? 48 : 86;

    const rowClues = Array(size).fill(0);
    const colClues = Array(size).fill(0);
    const blockClues = Array(size).fill(0);

    const allPositions = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Only fill half — symmetric counterpart will be handled
        if (r * size + c <= (size * size) / 2) {
          allPositions.push({ row: r, col: c });
        }
      }
    }

    shuffleArray(allPositions);

    let placedClues = 0;

    for (const { row, col } of allPositions) {
      const symRow = size - 1 - row;
      const symCol = size - 1 - col;

      const blockIndex1 = getBlockIndex(row, col, block, size);
      const blockIndex2 = getBlockIndex(symRow, symCol, block, size);

      // If positions are the same (center of grid), only add one
      const isSame = row === symRow && col === symCol;
      const neededClues = isSame ? 1 : 2;

      if (placedClues + neededClues > totalClueLimit) continue;

      if (
        rowClues[row] + 1 > maxCluesPerUnit ||
        colClues[col] + 1 > maxCluesPerUnit ||
        blockClues[blockIndex1] + 1 > maxCluesPerUnit
      )
        continue;

      if (
        !isSame &&
        (rowClues[symRow] + 1 > maxCluesPerUnit ||
          colClues[symCol] + 1 > maxCluesPerUnit ||
          blockClues[blockIndex2] + 1 > maxCluesPerUnit)
      )
        continue;

      puzzle[row][col] = grid[row][col];
      rowClues[row]++;
      colClues[col]++;
      blockClues[blockIndex1]++;
      placedClues++;

      if (!isSame) {
        puzzle[symRow][symCol] = grid[symRow][symCol];
        rowClues[symRow]++;
        colClues[symCol]++;
        blockClues[blockIndex2]++;
        placedClues++;
      }
    }

    return puzzle;
  }

  function getBlockIndex(row, col, block, size) {
    const blockRow = Math.floor(row / block.rows);
    const blockCol = Math.floor(col / block.cols);
    const blocksPerRow = size / block.cols;
    return blockRow * blocksPerRow + blockCol;
  }
});
