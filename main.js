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
  let currentSize = parseInt(gridSizeSelect.value);

  randomBtn.addEventListener("click", function () {
    const gridSizeSelect = document.getElementById("gridSize");
    currentSize = parseInt(gridSizeSelect.value); //Correct assignment

    // Get format name and ID
    const format = {
      9: "nona",
      12: "doza",
      16: "hexa",
    }[currentSize];

    const hexId = getFormatHexId(format); // Move this above heading update
    const seed = parseInt(hexId.slice(1, -2), 16);

    // Hide default headings
    document.getElementById("defaultHeading").classList.add("hidden");
    document.getElementById("defaultDate").classList.add("hidden");

    // Update and show puzzle heading
    const puzzleName = {
      9: "Nona",
      12: "Doza",
      16: "Hexa",
    }[currentSize];

    document.getElementById(
      "puzzleHeading"
    ).textContent = `Sudoku ${puzzleName} Puzzle`;
    document.getElementById("puzzleHeading").classList.remove("hidden");

    // Show puzzle ID in heading
    document.getElementById("puzzleIdText").textContent = hexId;
    document.getElementById("puzzleIdLine").classList.remove("hidden");

    // Generate grid
    const solution = generateValidGrid(currentSize, seed);

    if (currentSize === 12 || currentSize === 16) {
      currentGrid = createSymmetricPuzzle(solution, currentSize, seed);
    } else {
      currentGrid = createPuzzleFromGrid(solution, currentSize); // 9x9 non-symmetric
    }

    renderGrid(currentGrid, currentSize);

    // Hide top controls (select + generate)
    document.getElementById("topControls").classList.add("hidden");

    // Show puzzle grid
    document.getElementById("gridContainer").classList.remove("hidden");

    // Show download and back buttons
    document.getElementById("bottomControls").classList.remove("hidden");

    // Hide Random Button
    document.getElementById("randomBtn").style.display = "none";

    // Clear any messages if needed
    const messageEl = document.getElementById("message");
    if (messageEl) messageEl.textContent = "";
  });

  //download button
  downloadBtn.addEventListener("click", function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const linkedinURL = "https://www.linkedin.com/in/rathodnk/";

    const puzzle = currentGrid;
    const size = currentSize;

    // Determine format and hex ID
    const formatMap = { 9: "nona", 12: "doza", 16: "hexa" };
    const format = formatMap[size];
    const hexId = getFormatHexId(format);

    const titleMap = { 9: "Nona", 12: "Doza", 16: "Hexa" };
    const n1 = titleMap[size];

    const cellSize = 10; // mm
    const totalGridSize = size * cellSize;

    // Center grid horizontally
    const pageWidth = doc.internal.pageSize.getWidth();
    const startX = (pageWidth - totalGridSize) / 2;
    const startY = 30;

    // 1. Print ID at top-right corner
    doc.setFontSize(10);
    doc.text(`${hexId}`, pageWidth - 20, 15, { align: "right" });

    // 2. Puzzle title center
    doc.setFontSize(13.5);
    doc.text(`Sudoku ${n1} Puzzle (${size}x${size})`, pageWidth / 2, 20, {
      align: "center",
    });

    // 3. Draw puzzle grid centered
    doc.setFontSize(12);
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const x = startX + col * cellSize;
        const y = startY + row * cellSize;

        doc.rect(x, y, cellSize, cellSize);

        const val = puzzle[row][col];
        if (val !== "") {
          doc.text(val.toString(), x + cellSize / 2, y + cellSize / 2 + 1, {
            align: "center",
            baseline: "middle",
          });
        }
      }
    }

    // 4. Draw block lines thicker
    const block = blockDims[size];
    doc.setLineWidth(1);
    for (let i = 0; i <= size; i++) {
      if (i % block.cols === 0) {
        const x = startX + i * cellSize;
        doc.line(x, startY, x, startY + totalGridSize);
      }
      if (i % block.rows === 0) {
        const y = startY + i * cellSize;
        doc.line(startX, y, startX + totalGridSize, y);
      }
    }

    // 5. Print LinkedIn ID at center bottom
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(10);
    doc.textWithLink(
      "linkedin.com/in/rathodnk", // <--your actual ID
      pageWidth / 2,
      pageHeight - 10,
      {
        url: linkedinURL,
        align: "center",
      }
    );

    // Save PDF
    doc.save(`sudoku_${size}x${size}.pdf`);
  });

  const confirmPopup = document.getElementById("confirmPopup");
  const confirmYes = document.getElementById("confirmYes");
  const confirmNo = document.getElementById("confirmNo");

  document.getElementById("backBtn").addEventListener("click", () => {
    confirmPopup.classList.remove("hidden");
  });

  confirmYes.addEventListener("click", () => {
    // Proceed with back logic
    document.getElementById("topControls").classList.remove("hidden");

    document.getElementById("defaultHeading").classList.remove("hidden");
    document.getElementById("defaultDate").classList.remove("hidden");

    document.getElementById("puzzleHeading").classList.add("hidden");
    document.getElementById("puzzleIdLine").classList.add("hidden");

    document.getElementById("randomBtn").style.display = "inline-block";
    document.getElementById("gridContainer").classList.add("hidden");
    document.getElementById("bottomControls").classList.add("hidden");
    confirmPopup.classList.add("hidden");
  });

  confirmNo.addEventListener("click", () => {
    // Just close popup
    confirmPopup.classList.add("hidden");
  });

  function generateValidGrid(size, seed) {
    const dims = blockDims[size];
    let grid;
    let attempts = 0;
    const maxAttempts = 100;
    while (attempts < maxAttempts) {
      grid = Array(size)
        .fill()
        .map(() => Array(size).fill(""));
      const syms = symbols[size];

      for (let br = 0; br < size; br += dims.rows) {
        for (let bc = 0; bc < size; bc += dims.cols) {
          if (br === bc) {
            fillBlock(
              grid,
              br,
              bc,
              dims.rows,
              dims.cols,
              shuffleArraySeeded([...syms], seed + br + bc)
            );
          }
        }
      }

      if (fillRemaining(grid, 0, dims.rows, dims.cols, size, seed)) {
        if (validateGrid(grid, size)) {
          return grid;
        }
      }
      attempts++;
    }

    return generateSimpleGrid(size, dims, seed);
  }

  function fillRemaining(grid, index, blockRows, blockCols, size, seed) {
    if (index >= size * size) return true;
    const row = Math.floor(index / size);
    const col = index % size;
    if (grid[row][col] !== "") {
      return fillRemaining(grid, index + 1, blockRows, blockCols, size, seed);
    }
    const syms = shuffleArraySeeded([...symbols[size]], seed + index);
    for (const sym of syms) {
      if (isValidPlacement(grid, row, col, sym, blockRows, blockCols, size)) {
        grid[row][col] = sym;
        if (fillRemaining(grid, index + 1, blockRows, blockCols, size, seed)) {
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

  function generateSimpleGrid(size, dims, seed) {
    const grid = Array(size)
      .fill()
      .map(() => Array(size).fill(""));
    const syms = symbols[size];
    for (let br = 0; br < size; br += dims.rows) {
      for (let bc = 0; bc < size; bc += dims.cols) {
        fillBlock(
          grid,
          br,
          bc,
          dims.rows,
          dims.cols,
          shuffleArraySeeded([...syms], seed + br + bc)
        );
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

  function seededRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  function shuffleArraySeeded(array, seed) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(seed + i) * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function createPuzzleFromGrid(grid, size, seed) {
    const puzzle = Array(size)
      .fill()
      .map(() => Array(size).fill(""));
    const block = blockDims[size];

    const maxCluesPerUnit = 5;
    const totalClueLimit = 36;

    const rowClues = Array(size).fill(0);
    const colClues = Array(size).fill(0);
    const blockClues = Array(size).fill(0);

    // Symbol frequency map to ensure each appears at least once and at most 5 times
    const symbolFreq = {};
    const validSymbols = symbols[size];
    for (const sym of validSymbols) {
      symbolFreq[sym] = 0;
    }

    const allPositions = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        allPositions.push({ row: r, col: c });
      }
    }

    shuffleArraySeeded(allPositions, seed ^ 0xabcdef);

    let placedClues = 0;

    for (const { row, col } of allPositions) {
      if (placedClues >= totalClueLimit) break;

      const blockIndex = getBlockIndex(row, col, block, size);
      const sym = grid[row][col];

      if (
        rowClues[row] < maxCluesPerUnit &&
        colClues[col] < maxCluesPerUnit &&
        blockClues[blockIndex] < maxCluesPerUnit &&
        symbolFreq[sym] < 5
      ) {
        puzzle[row][col] = sym;
        rowClues[row]++;
        colClues[col]++;
        blockClues[blockIndex]++;
        symbolFreq[sym]++;
        placedClues++;
      }
    }

    // Ensure each symbol appears at least once (fallback placement if missing)
    for (const sym of validSymbols) {
      if (symbolFreq[sym] === 0) {
        outer: for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const blockIndex = getBlockIndex(r, c, block, size);
            if (
              puzzle[r][c] === "" &&
              rowClues[r] < maxCluesPerUnit &&
              colClues[c] < maxCluesPerUnit &&
              blockClues[blockIndex] < maxCluesPerUnit
            ) {
              puzzle[r][c] = sym;
              rowClues[r]++;
              colClues[c]++;
              blockClues[blockIndex]++;
              symbolFreq[sym]++;
              placedClues++;
              break outer;
            }
          }
        }
      }
    }

    return puzzle;
  }

  function createSymmetricPuzzle(grid, size, seed) {
    const puzzle = Array(size)
      .fill()
      .map(() => Array(size).fill(""));

    const block = blockDims[size];
    const maxCluesPerUnit = size === 12 ? 7 : 9;
    const totalClueLimit = size === 12 ? 65 : 116;
    const maxSymbolLimit = size === 12 ? 7 : 9;

    const rowClues = Array(size).fill(0);
    const colClues = Array(size).fill(0);
    const blockClues = Array(size).fill(0);

    const symbolFreq = {};
    const validSymbols = symbols[size];
    for (const sym of validSymbols) symbolFreq[sym] = 0;

    const allPositions = [];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (r * size + c <= (size * size) / 2) {
          allPositions.push({ row: r, col: c });
        }
      }
    }

    shuffleArraySeeded(allPositions, seed);
    let placedClues = 0;

    for (const { row, col } of allPositions) {
      const symRow = size - 1 - row;
      const symCol = size - 1 - col;
      const isSame = row === symRow && col === symCol;
      const neededClues = isSame ? 1 : 2;

      if (placedClues + neededClues > totalClueLimit) continue;

      const blockIndex1 = getBlockIndex(row, col, block, size);
      const blockIndex2 = getBlockIndex(symRow, symCol, block, size);

      const val1 = grid[row][col];
      const val2 = grid[symRow][symCol];

      // Check frequency limit
      if (symbolFreq[val1] + (isSame ? 1 : 1) > maxSymbolLimit) continue;
      if (!isSame && symbolFreq[val2] + 1 > maxSymbolLimit) continue;

      // Check clue constraints
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

      // Place first clue
      puzzle[row][col] = val1;
      rowClues[row]++;
      colClues[col]++;
      blockClues[blockIndex1]++;
      symbolFreq[val1]++;
      placedClues++;

      // Place symmetric clue
      if (!isSame) {
        puzzle[symRow][symCol] = val2;
        rowClues[symRow]++;
        colClues[symCol]++;
        blockClues[blockIndex2]++;
        symbolFreq[val2]++;
        placedClues++;
      }
    }

    // Ensure each symbol appears at least once
    for (const sym of validSymbols) {
      if (symbolFreq[sym] === 0) {
        outer: for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const blockIndex = getBlockIndex(r, c, block, size);
            if (
              puzzle[r][c] === "" &&
              rowClues[r] < maxCluesPerUnit &&
              colClues[c] < maxCluesPerUnit &&
              blockClues[blockIndex] < maxCluesPerUnit
            ) {
              puzzle[r][c] = sym;
              rowClues[r]++;
              colClues[c]++;
              blockClues[blockIndex]++;
              symbolFreq[sym]++;
              placedClues++;
              break outer;
            }
          }
        }
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

  function getFormatHexId(format) {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `#${
      format === "nona" ? 9 : format === "doza" ? 12 : 16
    }${dd}${mm}${yy}`.toLowerCase();
  }
});
