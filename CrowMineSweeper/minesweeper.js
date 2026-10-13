// Block native context menus across the game page before game initialization.
window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
}, { capture: true, passive: false });

// 지뢰찾기 메인 로직
class Minesweeper {
  constructor() {
    // 기본 설정 (중급)
    this.difficulties = {
      beginner: { width: 9, height: 9, mines: 10 },
      intermediate: { width: 16, height: 16, mines: 40 },
      expert: { width: 30, height: 16, mines: 99 },
    };

    this.currentMode = 'intermediate';
    this.width = 16;
    this.height = 16;
    this.totalMines = 40;

    // 게임 상태
    this.board = []; // 2차원 배열 { isMine, isRevealed, isFlagged, count }
    this.gameState = 'ready'; // 'ready', 'playing', 'won', 'lost'
    this.revealedCount = 0;
    this.flagCount = 0;
    this.timer = 0;
    this.timerInterval = null;
    this.mobileFlagMode = false;

    // 마우스 양클릭(Chord) 상태 추적
    this.mouseButtons = 0;

    // DOM 요소 캐싱
    this.boardElement = document.getElementById('mine-board');
    this.mineCounterEl = document.getElementById('mine-counter');
    this.timerEl = document.getElementById('timer');
    this.faceBtn = document.getElementById('face-btn');
    this.faceEmoji = document.getElementById('face-emoji');
    this.difficultySelect = document.getElementById('difficulty-select');
    this.customPanel = document.getElementById('custom-settings-panel');
    this.customWidthInput = document.getElementById('custom-width');
    this.customHeightInput = document.getElementById('custom-height');
    this.customMinesInput = document.getElementById('custom-mines');
    this.customApplyBtn = document.getElementById('custom-apply-btn');
    this.customError = document.getElementById('custom-error');
    this.soundToggleBtn = document.getElementById('sound-toggle-btn');
    this.flagModeBtn = document.getElementById('flag-mode-btn');

    // 모달 DOM
    this.modalOverlay = document.getElementById('game-modal');
    this.modalTitle = document.getElementById('modal-title');
    this.modalMessage = document.getElementById('modal-message');
    this.modalStats = document.getElementById('modal-stats');
    this.modalRestartBtn = document.getElementById('modal-restart-btn');
    this.modalCloseBtn = document.getElementById('modal-close-btn');

    this.initEvents();
    this.startNewGame();
  }

  initEvents() {
    // 1. 우클릭 컨텍스트 메뉴 브라우저 기본 동작 방지 (가장 중요!)
    this.boardElement.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // 우클릭 팝업 메뉴 차단
    });

    // 2. 스마일 버튼 클릭 -> 재시작
    this.faceBtn.addEventListener('click', () => {
      this.startNewGame();
    });

    // 3. 난이도 셀렉트 변경
    this.difficultySelect.addEventListener('change', (e) => {
      const mode = e.target.value;
      if (mode === 'custom') {
        this.customPanel.classList.remove('hidden');
      } else {
        this.customPanel.classList.add('hidden');
        this.currentMode = mode;
        const conf = this.difficulties[mode];
        this.width = conf.width;
        this.height = conf.height;
        this.totalMines = conf.mines;
        this.startNewGame();
      }
    });

    // 4. 커스텀 난이도 적용 버튼
    this.customApplyBtn.addEventListener('click', () => {
      this.applyCustomSettings();
    });

    // 5. 사운드 켜기/끄기 토글
    this.soundToggleBtn.addEventListener('click', () => {
      const isSoundOn = window.soundManager.toggle();
      this.soundToggleBtn.textContent = isSoundOn ? '🔊 소리 켜짐' : '🔇 소리 꺼짐';
      this.soundToggleBtn.classList.toggle('active', !isSoundOn);
    });

    // 6. 모바일 깃발 모드 토글
    this.flagModeBtn.addEventListener('click', () => {
      this.mobileFlagMode = !this.mobileFlagMode;
      this.flagModeBtn.textContent = this.mobileFlagMode ? '🚩 깃발 모드: ON' : '🚩 깃발 모드: OFF';
      this.flagModeBtn.classList.toggle('active', this.mobileFlagMode);
    });

    // 7. 모달 닫기 및 재시작
    this.modalRestartBtn.addEventListener('click', () => {
      this.modalOverlay.classList.add('hidden');
      this.startNewGame();
    });
    this.modalCloseBtn.addEventListener('click', () => {
      this.modalOverlay.classList.add('hidden');
    });

    // 8. 마우스 버튼 동시 클릭(Chord) 감지를 위한 전역 이벤트 리스너
    window.addEventListener('mouseup', () => {
      if (this.gameState === 'playing' && this.faceEmoji.textContent === '😮') {
        this.faceEmoji.textContent = '🙂';
      }
    });
  }

  applyCustomSettings() {
    const w = parseInt(this.customWidthInput.value, 10);
    const h = parseInt(this.customHeightInput.value, 10);
    const m = parseInt(this.customMinesInput.value, 10);

    if (isNaN(w) || isNaN(h) || isNaN(m)) {
      this.customError.textContent = '올바른 숫자를 입력하세요.';
      return;
    }
    if (w < 8 || w > 50) {
      this.customError.textContent = '가로 너비는 8 ~ 50 사이여야 합니다.';
      return;
    }
    if (h < 8 || h > 30) {
      this.customError.textContent = '세로 높이는 8 ~ 30 사이여야 합니다.';
      return;
    }
    const maxMines = Math.floor(w * h * 0.85); // 최대 85%까지 제한
    if (m < 1 || m > maxMines) {
      this.customError.textContent = `지뢰 개수는 1 ~ ${maxMines}개 사이여야 합니다.`;
      return;
    }

    this.customError.textContent = '';
    this.width = w;
    this.height = h;
    this.totalMines = m;
    this.currentMode = 'custom';
    this.startNewGame();
  }

  startNewGame() {
    this.stopTimer();
    this.timer = 0;
    this.updateTimerDisplay();

    this.gameState = 'ready';
    this.revealedCount = 0;
    this.flagCount = 0;
    this.updateMineCounterDisplay();
    this.faceEmoji.textContent = '🙂';

    this.createBoardData();
    this.renderBoard();
  }

  createBoardData() {
    this.board = [];
    for (let r = 0; r < this.height; r++) {
      const row = [];
      for (let c = 0; c < this.width; c++) {
        row.push({
          r,
          c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          count: 0,
          element: null
        });
      }
      this.board.push(row);
    }
  }

  // 첫 클릭 시 지뢰 배치 (첫 클릭 칸과 그 주변 8칸은 지뢰가 나오지 않도록 보장!)
  placeMines(firstR, firstC) {
    const forbidden = new Set();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = firstR + dr;
        const nc = firstC + dc;
        if (this.isValid(nr, nc)) {
          forbidden.add(`${nr},${nc}`);
        }
      }
    }

    // 후보 타일 목록
    const candidates = [];
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (!forbidden.has(`${r},${c}`)) {
          candidates.push({ r, c });
        }
      }
    }

    // 만약 지뢰 수가 너무 많아 남은 후보 칸보다 크다면 금지 구역 최소화
    if (candidates.length < this.totalMines) {
      candidates.length = 0;
      for (let r = 0; r < this.height; r++) {
        for (let c = 0; c < this.width; c++) {
          if (r !== firstR || c !== firstC) {
            candidates.push({ r, c });
          }
        }
      }
    }

    // Fisher-Yates 셔플로 랜덤 지뢰 선정
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const mineCoords = candidates.slice(0, this.totalMines);
    for (const coord of mineCoords) {
      this.board[coord.r][coord.c].isMine = true;
    }

    // 인접 지뢰 개수 계산
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (!this.board[r][c].isMine) {
          this.board[r][c].count = this.countAdjacentMines(r, c);
        }
      }
    }
  }

  countAdjacentMines(r, c) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (this.isValid(nr, nc) && this.board[nr][nc].isMine) {
          count++;
        }
      }
    }
    return count;
  }

  isValid(r, c) {
    return r >= 0 && r < this.height && c >= 0 && c < this.width;
  }

  renderBoard() {
    this.boardElement.innerHTML = '';
    this.boardElement.style.gridTemplateColumns = `repeat(${this.width}, 25px)`;
    this.boardElement.style.gridTemplateRows = `repeat(${this.height}, 25px)`;

    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        const tileData = this.board[r][c];
        const tileEl = document.createElement('div');
        tileEl.classList.add('tile');
        tileEl.dataset.row = r;
        tileEl.dataset.col = c;
        tileData.element = tileEl;

        // 이벤트 연결
        this.attachTileEvents(tileEl, r, c);
        this.boardElement.appendChild(tileEl);
      }
    }
  }

  attachTileEvents(tileEl, r, c) {
    // 1. 우클릭 이벤트 (깃발 꽂기/해제 & 우클릭 메뉴 차단)
    tileEl.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // 기본 메뉴 차단
      if (this.gameState === 'lost' || this.gameState === 'won') return;
      this.toggleFlag(r, c);
    });

    // 2. 마우스 다운 (스마일 놀라는 표정 😮)
    tileEl.addEventListener('mousedown', (e) => {
      if (this.gameState === 'lost' || this.gameState === 'won') return;

      if (e.button === 0) { // 좌클릭
        if (this.faceEmoji.textContent === '🙂') {
          this.faceEmoji.textContent = '😮';
        }
      }

      // 양쪽 버튼(Chord) 감지
      if (e.buttons === 3) {
        this.highlightNeighbors(r, c, true);
      }
    });

    // 3. 마우스 업 (표정 복구 및 Chord 실행)
    tileEl.addEventListener('mouseup', (e) => {
      if (this.gameState === 'playing' && this.faceEmoji.textContent === '😮') {
        this.faceEmoji.textContent = '🙂';
      }
      this.highlightNeighbors(r, c, false);
    });

    // 4. 좌클릭 이벤트 (열기 또는 모바일 깃발)
    tileEl.addEventListener('click', (e) => {
      if (this.gameState === 'lost' || this.gameState === 'won') return;

      // 모바일 깃발 모드가 켜져 있는 경우 우클릭처럼 동작
      if (this.mobileFlagMode) {
        this.toggleFlag(r, c);
        return;
      }

      this.handleTileClick(r, c);
    });

    // 5. 이미 열린 숫자 타일 더블클릭 -> Chord (주변 미열람 일괄 오픈)
    tileEl.addEventListener('dblclick', () => {
      if (this.gameState !== 'playing') return;
      this.chordTile(r, c);
    });
  }

  // 타일 좌클릭 처리
  handleTileClick(r, c) {
    const tile = this.board[r][c];
    if (tile.isFlagged || tile.isRevealed) {
      if (tile.isRevealed && tile.count > 0) {
        this.chordTile(r, c);
      }
      return;
    }

    // 첫 클릭 처리
    if (this.gameState === 'ready') {
      this.placeMines(r, c);
      this.gameState = 'playing';
      this.startTimer();
    }

    // 지뢰를 밟은 경우 -> 패배
    if (tile.isMine) {
      this.gameOver(r, c);
      return;
    }

    // 안전한 타일 오픈
    window.soundManager.playClick();
    this.revealTile(r, c);

    // 승리 조건 체크
    this.checkWinCondition();
  }

  // 타일 열기 (재귀 / Flood fill)
  revealTile(r, c) {
    const tile = this.board[r][c];
    if (tile.isRevealed || tile.isFlagged) return;

    tile.isRevealed = true;
    this.revealedCount++;
    const el = tile.element;
    el.classList.add('revealed');

    if (tile.count > 0) {
      el.textContent = tile.count;
      el.dataset.count = tile.count;
    } else {
      // 0 빈 칸인 경우: 인접 8개 타일 연쇄 오픈
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (this.isValid(nr, nc)) {
            this.revealTile(nr, nc);
          }
        }
      }
    }
  }

  // 깃발 토글 (우클릭)
  toggleFlag(r, c) {
    const tile = this.board[r][c];
    if (tile.isRevealed) return;

    tile.isFlagged = !tile.isFlagged;
    if (tile.isFlagged) {
      this.flagCount++;
      tile.element.classList.add('flagged');
      tile.element.textContent = '🚩';
    } else {
      this.flagCount--;
      tile.element.classList.remove('flagged');
      tile.element.textContent = '';
    }

    window.soundManager.playFlag();
    this.updateMineCounterDisplay();
  }

  // 열린 숫자 타일 주변 일괄 오픈 (Chord 테크닉)
  chordTile(r, c) {
    const tile = this.board[r][c];
    if (!tile.isRevealed || tile.count === 0) return;

    // 주변 깃발 개수 계산
    let flaggedNeighbors = 0;
    const neighbors = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (this.isValid(nr, nc)) {
          neighbors.push(this.board[nr][nc]);
          if (this.board[nr][nc].isFlagged) {
            flaggedNeighbors++;
          }
        }
      }
    }

    // 깃발 개수가 해당 숫자와 일치하면 깃발이 아닌 타일 일괄 오픈
    if (flaggedNeighbors === tile.count) {
      let triggeredMine = null;
      for (const n of neighbors) {
        if (!n.isFlagged && !n.isRevealed) {
          if (n.isMine) {
            triggeredMine = n;
          } else {
            this.revealTile(n.r, n.c);
          }
        }
      }

      if (triggeredMine) {
        this.gameOver(triggeredMine.r, triggeredMine.c);
      } else {
        window.soundManager.playClick();
        this.checkWinCondition();
      }
    }
  }

  // Chord 시 누름 미리보기 하이라이트
  highlightNeighbors(r, c, isHighlight) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (this.isValid(nr, nc)) {
          const n = this.board[nr][nc];
          if (!n.isRevealed && !n.isFlagged) {
            n.element.classList.toggle('pressed', isHighlight);
          }
        }
      }
    }
  }

  // 승리 조건 체크
  checkWinCondition() {
    const totalTiles = this.width * this.height;
    if (this.revealedCount === totalTiles - this.totalMines) {
      this.gameWin();
    }
  }

  // 승리 처리
  gameWin() {
    this.gameState = 'won';
    this.stopTimer();
    this.faceEmoji.textContent = '😎';
    window.soundManager.playWin();

    // 남은 모든 지뢰에 깃발 꽂기
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        const tile = this.board[r][c];
        if (tile.isMine && !tile.isFlagged) {
          tile.isFlagged = true;
          tile.element.classList.add('flagged');
          tile.element.textContent = '🚩';
        }
      }
    }
    this.flagCount = this.totalMines;
    this.updateMineCounterDisplay();

    // 승리 모달 표시
    this.modalTitle.textContent = '🎉 승리했습니다!';
    this.modalMessage.textContent = '축하합니다! 모든 지뢰를 무사히 찾아냈습니다.';
    this.modalStats.innerHTML = `
      <strong>소요 시간:</strong> ${this.timer}초<br>
      <strong>난이도:</strong> ${this.getDifficultyLabel()}<br>
      <strong>지뢰 개수:</strong> ${this.totalMines}개
    `;
    this.modalOverlay.classList.remove('hidden');
  }

  // 게임 오버 (패배)
  gameOver(hitR, hitC) {
    this.gameState = 'lost';
    this.stopTimer();
    this.faceEmoji.textContent = '😵';
    window.soundManager.playExplode();

    // 밟은 지뢰 표시
    const hitTile = this.board[hitR][hitC];
    hitTile.element.classList.add('exploded');
    hitTile.element.textContent = '💥';

    // 전체 지뢰 공개 및 잘못 꽂은 깃발 표시
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        const tile = this.board[r][c];
        if (r === hitR && c === hitC) continue;

        if (tile.isMine && !tile.isFlagged) {
          // 숨겨진 지뢰 공개
          tile.element.classList.add('revealed');
          tile.element.textContent = '💣';
        } else if (!tile.isMine && tile.isFlagged) {
          // 잘못 꽂은 깃발 (X 표시)
          tile.element.classList.add('wrong-flag');
        }
      }
    }

    // 패배 모달 표시
    setTimeout(() => {
      this.modalTitle.textContent = '💥 게임 오버!';
      this.modalMessage.textContent = '지뢰를 밟았습니다! 다음엔 더 신중하게 도전해 보세요.';
      this.modalStats.innerHTML = `
        <strong>소요 시간:</strong> ${this.timer}초<br>
        <strong>난이도:</strong> ${this.getDifficultyLabel()}<br>
        <strong>오픈한 칸:</strong> ${this.revealedCount} / ${(this.width * this.height - this.totalMines)}
      `;
      this.modalOverlay.classList.remove('hidden');
    }, 600);
  }

  getDifficultyLabel() {
    if (this.currentMode === 'beginner') return '초급 (9×9)';
    if (this.currentMode === 'intermediate') return '중급 (16×16)';
    if (this.currentMode === 'expert') return '고급 (30×16)';
    return `사용자 지정 (${this.width}×${this.height})`;
  }

  // 타이머 관리
  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.timer < 999) {
        this.timer++;
        this.updateTimerDisplay();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerDisplay() {
    const formatted = String(Math.min(999, this.timer)).padStart(3, '0');
    this.timerEl.textContent = formatted;
  }

  updateMineCounterDisplay() {
    const remaining = this.totalMines - this.flagCount;
    let formatted;
    if (remaining < 0) {
      const positiveStr = String(Math.abs(remaining)).padStart(2, '0');
      formatted = `-${positiveStr.slice(-2)}`;
    } else {
      formatted = String(remaining).padStart(3, '0');
    }
    this.mineCounterEl.textContent = formatted;
  }
}

// 게임 인스턴스 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.minesweeper = new Minesweeper();
});
