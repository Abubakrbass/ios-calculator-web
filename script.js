let currentInput = '0';
let previousInput = '';
let operator = null;
let shouldResetDisplay = false;
let history = JSON.parse(localStorage.getItem('calc_history') || '[]');

function toggleHistory() {
    const panel = document.getElementById('history-panel');
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
        renderHistory();
    }
}

function toggleDonate() {
    const panel = document.getElementById('donate-panel');
    panel.classList.toggle('open');
}

function triggerDonateConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        // Безопасное создание элементов (защита от XSS)
        const exprDiv = document.createElement('div');
        exprDiv.className = 'history-expr';
        exprDiv.textContent = item.expr;

        const resDiv = document.createElement('div');
        resDiv.className = 'history-res';
        resDiv.textContent = item.res;

        div.appendChild(exprDiv);
        div.appendChild(resDiv);

        div.onclick = () => {
            currentInput = item.res.toString();
            updateDisplay();
            toggleHistory();
        };
        list.appendChild(div);
    });
}

function clearHistory() {
    history = [];
    localStorage.removeItem('calc_history');
    renderHistory();
}

// Закрытие панелей при клике вне их области
document.addEventListener('click', (event) => {
    const historyPanel = document.getElementById('history-panel');
    const historyBtn = document.getElementById('history-btn');
    const donatePanel = document.getElementById('donate-panel');
    const donateBtn = document.getElementById('donate-btn');
    
    // Закрытие истории
    if (historyPanel.classList.contains('open') && 
        !historyPanel.contains(event.target) && 
        !historyBtn.contains(event.target)) {
        toggleHistory();
    }

    // Закрытие донатов
    if (donatePanel.classList.contains('open') && 
        !donatePanel.contains(event.target) && 
        !donateBtn.contains(event.target)) {
        toggleDonate();
    }
});

// Звуковой эффект (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playClickSound() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'triangle'; // Мягкий тип волны для приятного звука
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.05);
}

function playStartupSound() {
    // Попытка запустить аудиоконтекст (браузеры могут блокировать автовоспроизведение без клика)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Приятный "взлетающий" звук (Sine wave)
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.4);
}

// Добавляем звук ко всем кнопкам при клике
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', playClickSound);
});

const displayElement = document.getElementById('display');

// Обработка свайпа и долгого нажатия (Paste)
let touchStartX = 0;
let touchEndX = 0;
let longPressTimer;
let isLongPress = false;

displayElement.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].clientX;
    isLongPress = false;
    longPressTimer = setTimeout(() => {
        isLongPress = true;
        pasteFromClipboard();
    }, 600);
});

displayElement.addEventListener('touchend', e => {
    e.preventDefault(); // Предотвращаем двойное срабатывание (мышь + тач)
    clearTimeout(longPressTimer);
    if (isLongPress) return;

    touchEndX = e.changedTouches[0].clientX;
    handleSwipe();
});

displayElement.addEventListener('touchmove', e => {
    if (Math.abs(e.changedTouches[0].clientX - touchStartX) > 10) {
        clearTimeout(longPressTimer);
    }
});

// Добавляем поддержку мыши (для тестирования на ПК)
displayElement.addEventListener('mousedown', e => {
    touchStartX = e.clientX;
    isLongPress = false;
    longPressTimer = setTimeout(() => {
        isLongPress = true;
        pasteFromClipboard();
    }, 600);
});

displayElement.addEventListener('mouseup', e => {
    clearTimeout(longPressTimer);
    if (isLongPress) return;

    touchEndX = e.clientX;
    handleSwipe();
});

displayElement.addEventListener('mousemove', e => {
    if (Math.abs(e.clientX - touchStartX) > 10) {
        clearTimeout(longPressTimer);
    }
});

function handleSwipe() {
    if (Math.abs(touchEndX - touchStartX) > 30) {
        backspace();
    } else {
        copyToClipboard();
    }
}

function updateDisplay() {
    // Форматирование числа с пробелами (например, 1 000 000)
    let parts = currentInput.split('.');
    let integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    let decimalPart = parts.length > 1 ? ',' + parts[1] : '';
    let displayText = integerPart + decimalPart;
    
    // Логика уменьшения шрифта: чем длиннее число, тем меньше шрифт
    let fontSize = 60;
    if (displayText.length > 6) {
        fontSize = Math.max(25, 60 - (displayText.length - 6) * 3.5);
    }

    displayElement.style.fontSize = fontSize + 'px';

    if (displayText.length > 25) {
        displayText = displayText.substring(0, 25);
    }
    displayElement.innerText = displayText;

    // Анимация при обновлении
    displayElement.classList.remove('animate');
    void displayElement.offsetWidth; // Перезапуск анимации
    displayElement.classList.add('animate');
}

function copyToClipboard() {
    const text = displayElement.innerText;
    navigator.clipboard.writeText(text).then(() => {
        const tooltip = document.getElementById('copy-tooltip');
        tooltip.classList.add('visible');
        setTimeout(() => {
            tooltip.classList.remove('visible');
        }, 1500);
    }).catch(err => console.error('Ошибка копирования:', err));
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        // Очистка: убираем пробелы, меняем запятую на точку
        const sanitized = text.replace(/\s/g, '').replace(',', '.');
        if (!isNaN(sanitized) && sanitized !== '') {
            currentInput = sanitized;
            shouldResetDisplay = false;
            updateDisplay();
            
            const tooltip = document.getElementById('copy-tooltip');
            const originalText = tooltip.innerText;
            tooltip.innerText = "Вставлено";
            tooltip.classList.add('visible');
            setTimeout(() => {
                tooltip.classList.remove('visible');
                setTimeout(() => tooltip.innerText = originalText, 300);
            }, 1500);
        }
    } catch (err) {
        console.error('Ошибка вставки:', err);
    }
}

function appendNumber(number) {
    if (currentInput === '0' || shouldResetDisplay) {
        currentInput = number;
        shouldResetDisplay = false;
        updateOperatorVisuals(null);
    } else {
        if (currentInput.length < 16) { // Лимит увеличен до 16 цифр
            currentInput += number;
        }
    }
    updateDisplay();
}

function backspace() {
    if (shouldResetDisplay) return;
    
    if (currentInput.length === 1 || (currentInput.length === 2 && currentInput.startsWith('-'))) {
        currentInput = '0';
    } else {
        currentInput = currentInput.slice(0, -1);
    }
    updateDisplay();
}

function appendDot() {
    if (shouldResetDisplay) {
        currentInput = '0.';
        shouldResetDisplay = false;
    } else if (!currentInput.includes('.')) {
        currentInput += '.';
    }
    updateDisplay();
}

function clearDisplay() {
    currentInput = '0';
    previousInput = '';
    operator = null;
    updateOperatorVisuals(null);
    updateDisplay();
}

function toggleSign() {
    currentInput = (parseFloat(currentInput) * -1).toString();
    updateDisplay();
}

function percentage() {
    currentInput = (parseFloat(currentInput) / 100).toString();
    updateDisplay();
}

function setOperator(op) {
    if (operator !== null && !shouldResetDisplay) calculate();
    previousInput = currentInput;
    operator = op;
    shouldResetDisplay = true;
    updateOperatorVisuals(op);
}

function updateOperatorVisuals(activeOp) {
    document.querySelectorAll('.btn-orange').forEach(btn => {
        if (btn.dataset.op === activeOp) {
            btn.classList.add('active-operator');
        } else {
            btn.classList.remove('active-operator');
        }
    });
}

function calculate() {
    if (operator === null || shouldResetDisplay) return;
    
    let result;
    const prev = parseFloat(previousInput);
    const current = parseFloat(currentInput);

    switch (operator) {
        case '+':
            result = prev + current;
            break;
        case '-':
            result = prev - current;
            break;
        case '*':
            result = prev * current;
            break;
        case '/':
            if (current === 0) {
                triggerError();
                return;
            }
            result = prev / current;
            break;
        default:
            return;
    }

    // Сохранение в историю
    const opSymbols = { '/': '÷', '*': '×', '-': '−', '+': '+' };
    const resultVal = Math.round(result * 100000000) / 100000000;
    history.unshift({
        expr: `${previousInput} ${opSymbols[operator] || operator} ${currentInput} =`,
        res: resultVal
    });
    if (history.length > 20) history.pop();
    localStorage.setItem('calc_history', JSON.stringify(history));

    // Округление, чтобы избежать проблем с плавающей точкой (например 0.1 + 0.2)
    currentInput = resultVal + "";
    operator = null;
    shouldResetDisplay = true;
    updateOperatorVisuals(null);
    updateDisplay();
}

function triggerError() {
    displayElement.innerText = "Ошибка";
    displayElement.classList.add('error');
    
    // Сброс состояния
    currentInput = '0';
    previousInput = '';
    operator = null;
    updateOperatorVisuals(null);

    setTimeout(() => {
        displayElement.classList.remove('error');
        updateDisplay();
    }, 1000);
}

document.addEventListener('keydown', (event) => {
    const key = event.key;
    
    // Воспроизводим звук только для кнопок калькулятора
    if ((key >= '0' && key <= '9') || ['Backspace', 'Enter', '=', 'Escape', '+', '-', '*', '/', '.', ','].includes(key)) {
        playClickSound();
    }

    if (key >= '0' && key <= '9') {
        appendNumber(key);
    } else if (key === 'Backspace') {
        backspace();
    } else if (key === 'Enter' || key === '=') {
        event.preventDefault();
        calculate();
    } else if (key === 'Escape') {
        clearDisplay();
    } else if (['+', '-', '*', '/'].includes(key)) {
        setOperator(key);
    } else if (key === '.' || key === ',') {
        appendDot();
    }
});

const themeSwitcher = document.getElementById('theme-switcher');
const body = document.body;
const currentTheme = localStorage.getItem('theme') || 'dark';

if (currentTheme === 'light') {
    body.classList.add('light-theme');
    themeSwitcher.textContent = '☀️';
}

themeSwitcher.addEventListener('click', () => {
    body.classList.toggle('light-theme');
    const newTheme = body.classList.contains('light-theme') ? 'light' : 'dark';
    themeSwitcher.textContent = newTheme === 'light' ? '☀️' : '🌙';
    localStorage.setItem('theme', newTheme);
});

// Регистрация Service Worker для PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker зарегистрирован', reg))
            .catch(err => console.log('Ошибка регистрации Service Worker', err));
    });
}

// Управление заставкой (Splash Screen)
window.addEventListener('load', () => {
    playStartupSound();
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 800); // Заставка видна минимум 0.8 секунды
});
