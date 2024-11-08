import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const port = 3456;

app.use(cors());

// HTML template
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bitcoin Price in Binary</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #000;
            color: #fff;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }

        .container {
            background: #000;
            padding: 1.5rem;
            max-width: 900px;
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            box-sizing: border-box;
            position: relative;
        }

        .binary-list {
            font-family: 'Courier New', monospace;
            font-size: 1.8rem;
            text-align: center;
            word-wrap: break-word;
            color: #00ff00;
            margin-bottom: 15vh;
            height: calc(2.16rem * 20);
            position: relative;
            overflow: hidden;
        }

        .lines-container {
            position: absolute;
            width: 100%;
            bottom: 0;
            animation: moveUp 1s linear infinite;
            transform: translateY(0);
        }

        .lines-container.new {
            animation: none;
            transform: translateY(2.16rem);
        }

        @keyframes moveUp {
            from { transform: translateY(0); }
            to { transform: translateY(-2.16rem); }
        }

        .binary-price {
            line-height: 2.16rem;
            height: 2.16rem;
            font-family: 'Courier New', monospace;
            white-space: pre;
            letter-spacing: 2px;
        }

        .digit {
            display: inline-block;
            color: #00ff00;
            transition: color 0.3s ease;
        }

        .digit.gold {
            color: #ffd700;
            text-shadow: 0 0 5px #ffd700;
        }

        .separator {
            color: #00ff00;
            margin: 0 10px;
        }

        .timestamp {
            position: absolute;
            bottom: 10px;
            right: 10px;
            color: #333;
            font-size: 0.7rem;
            font-family: monospace;
        }

        .error {
            color: #ff4444;
            text-align: center;
            display: none;
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.8rem;
            background: rgba(0, 0, 0, 0.8);
            padding: 5px 10px;
            border-radius: 3px;
        }

        .status {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #00ff00;
            position: fixed;
            top: 10px;
            right: 10px;
            opacity: 0.5;
        }

        @media (max-width: 480px) {
            .binary-list {
                font-size: 1.2rem;
                height: calc(1.44rem * 20);
            }
            .binary-price {
                line-height: 1.44rem;
                height: 1.44rem;
            }
            @keyframes moveUp {
                from { transform: translateY(0); }
                to { transform: translateY(-1.44rem); }
            }
            .lines-container.new {
                transform: translateY(1.44rem);
            }
        }
    </style>
</head>
<body>
    <div class="status" id="status"></div>
    <div class="container">
        <div class="binary-list" id="binary-list">
            <div class="lines-container" id="lines-container"></div>
        </div>
        <div class="timestamp" id="timestamp">00:00:00</div>
    </div>
    <div class="error" id="error"></div>

    <script>
        function toBinary(price) {
            return Math.round(price).toString(2);
        }

        function getSecondsAfterMidnight() {
            const now = new Date();
            return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        }

        function secondsToBinary(seconds) {
            return seconds.toString(2).padStart(17, '0');
        }

        function updateTimestamp() {
            const now = new Date();
            document.getElementById('timestamp').textContent = 
                now.toLocaleTimeString();
            return now;
        }

        function showError(message) {
            const errorEl = document.getElementById('error');
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            document.getElementById('status').style.background = '#ff4444';
        }

        function clearError() {
            document.getElementById('error').style.display = 'none';
            document.getElementById('status').style.background = '#00ff00';
        }

        function findMatchingDigits(binaryPrice, binaryTime) {
            const matches = [];
            const minLength = Math.min(binaryPrice.length, binaryTime.length);
            
            // Compare from right to left
            for (let i = 1; i <= minLength; i++) {
                if (binaryPrice[binaryPrice.length - i] === binaryTime[binaryTime.length - i]) {
                    matches.unshift(binaryPrice.length - i);
                } else {
                    break;
                }
            }
            
            return matches;
        }

        function createDigitSpan(digit, isGold = false) {
            return \`<span class="digit\${isGold ? ' gold' : ''}">\${digit}</span>\`;
        }

        function formatBinaryWithHighlight(binary, matchingIndices) {
            return binary.split('').map((digit, index) => 
                createDigitSpan(digit, matchingIndices.includes(index))
            ).join('');
        }

        let lastPrice = null;
        const MAX_HISTORY = 20;
        let nextUpdateTime = 0;

        function addPriceToHistory(price, binaryTime) {
            const listEl = document.getElementById('binary-list');
            const oldContainer = document.getElementById('lines-container');
            const binaryPrice = toBinary(price);
            
            // Create new container
            const newContainer = document.createElement('div');
            newContainer.className = 'lines-container new';
            newContainer.id = 'lines-container';
            
            // Clone existing lines
            Array.from(oldContainer.children).forEach(line => {
                newContainer.appendChild(line.cloneNode(true));
            });
            
            // Create new price element
            const priceEl = document.createElement('div');
            priceEl.className = 'binary-price';
            
            // Find matching digits between price and time
            const matchingIndices = findMatchingDigits(binaryPrice, binaryTime);
            
            // Format binary numbers with highlighting
            const formattedPrice = formatBinaryWithHighlight(binaryPrice, matchingIndices);
            const formattedTime = formatBinaryWithHighlight(binaryTime, 
                matchingIndices.map(i => i - (binaryPrice.length - binaryTime.length))
            );
            
            // Display price @ time with matching sections highlighted
            priceEl.innerHTML = formattedPrice + '<span class="separator">@</span>' + formattedTime;
            
            // Add new line to container
            newContainer.appendChild(priceEl);
            
            // Set opacity for all lines
            const lines = Array.from(newContainer.children);
            lines.forEach((line, i) => {
                line.style.opacity = 1 - ((lines.length - 1 - i) * (0.8 / MAX_HISTORY));
            });

            // Add new container to list
            listEl.appendChild(newContainer);
            
            // Start animation on next frame
            requestAnimationFrame(() => {
                newContainer.classList.remove('new');
                newContainer.style.animation = 'moveUp 1s linear infinite';
                
                // Remove old container and lines
                oldContainer.remove();
                while (newContainer.children.length > MAX_HISTORY) {
                    newContainer.removeChild(newContainer.firstChild);
                }
            });
        }

        let activeRequest = null;

        async function updatePrice() {
            // Cancel previous request if it exists
            if (activeRequest) {
                activeRequest.abort();
            }

            // Create new abort controller for this request
            const abortController = new AbortController();
            activeRequest = abortController;

            try {
                const response = await fetch('/api/price', {
                    signal: abortController.signal,
                    cache: 'no-store',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Server error');
                }
                
                const data = await response.json();
                
                if (!data.price && data.price !== 0) {
                    throw new Error('Invalid price data');
                }

                lastPrice = data.price;
                clearError();
            } catch (error) {
                if (error.name !== 'AbortError') {
                    showError('Failed to update price: ' + error.message);
                }
            } finally {
                if (activeRequest === abortController) {
                    activeRequest = null;
                }
            }
        }

        function updateDisplay() {
            const now = new Date();
            
            // Only update on the second
            if (now.getTime() >= nextUpdateTime) {
                const seconds = getSecondsAfterMidnight();
                const binaryTime = secondsToBinary(seconds);
                addPriceToHistory(lastPrice || 0, binaryTime);
                updateTimestamp();
                
                // Set next update time to next second
                nextUpdateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                    now.getHours(), now.getMinutes(), now.getSeconds() + 1, 0).getTime();
            }
        }

        // Initial price update
        updatePrice();

        // Update price every 100ms
        setInterval(updatePrice, 100);

        // Update display exactly on the second
        setInterval(updateDisplay, 10);

        // Set initial next update time
        const now = new Date();
        nextUpdateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
            now.getHours(), now.getMinutes(), now.getSeconds() + 1, 0).getTime();
    </script>
</body>
</html>`;

// Cache management
let priceCache = {
    price: null,
    timestamp: 0
};

// Reduced cache duration
const CACHE_DURATION = 50;

// Track ongoing request
let currentRequest = null;

async function fetchBitcoinPrice() {
    const now = Date.now();
    
    // Return cached price if within cache duration
    if (priceCache.price && (now - priceCache.timestamp) < CACHE_DURATION) {
        return priceCache;
    }

    // If there's an ongoing request, return its promise
    if (currentRequest) {
        return currentRequest;
    }

    try {
        currentRequest = (async () => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);

            try {
                const response = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot', {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Bitcoin Binary Price Display'
                    },
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                
                const data = await response.json();
                
                if (!data || !data.data || !data.data.amount) {
                    throw new Error('Invalid response format from API');
                }

                // Update cache
                priceCache = {
                    price: parseFloat(data.data.amount),
                    timestamp: now
                };
                
                return priceCache;
            } finally {
                clearTimeout(timeout);
            }
        })();

        const result = await currentRequest;
        currentRequest = null;
        return result;
    } catch (error) {
        currentRequest = null;
        console.error('Error fetching Bitcoin price:', error);
        
        if (priceCache.price) {
            return priceCache;
        }
        
        throw error;
    }
}

// API endpoint
app.get('/api/price', async (req, res) => {
    try {
        const priceData = await fetchBitcoinPrice();
        res.set('Cache-Control', 'no-store');
        res.json(priceData);
    } catch (error) {
        if (priceCache.price) {
            res.json({
                ...priceCache,
                error: error.message
            });
        } else {
            res.status(500).json({
                error: error.message,
                timestamp: Date.now()
            });
        }
    }
});

// Serve HTML for all other routes
app.get('*', (req, res) => {
    res.type('html').send(html);
});

app.listen(port, () => {
    console.log('Server running at http://localhost:' + port);
});
