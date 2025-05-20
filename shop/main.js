let allProductsCache = {};
const API_KEY = "AIzaSyDHbhK8_EZRJ_Br6MsviB2Pu6BuE6KctVg";
const MAX_CHAT_HISTORY = 10;

const productFiles = [
    "./beanies caps for men women.json",
    "./branded hand women bags.json",
    "./Formal Dresses_men.json",
    "./Formal Dresses_women.json",
    "./high end shoes for men.json",
    "./high end shoes for women.json",
    "./lather jackets men.json",
    "./lather jackets women.json",
    "./socks for men.json",
    "./socks for women.json",
    "./sunglasses mens.json",
    "./sunglasses womens.json",
    "./tshirts shirts for men.json",
    "./tshirts shirts for women.json"
];

function loadChatHistory() {
    const history = localStorage.getItem('chatHistory');
    return history ? JSON.parse(history) : [];
}

function saveChatHistory(entry) {
    let history = loadChatHistory();
    history.push(entry);
    if (history.length > MAX_CHAT_HISTORY) {
        history = history.slice(-MAX_CHAT_HISTORY);
    }
    localStorage.setItem('chatHistory', JSON.stringify(history));
}

async function addToCart(product) {
    let quantity = 1;
    const { id, title, price, imageUrl, user_id } = product;

    if (!id || !title || !price || !imageUrl || !user_id) {
        console.error("Missing required product fields");
        return;
    }

    try {
        const response = await fetch("https://fitsedit.tooliso.com/cart/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
                user_id,
                id,
                title,
                price,
                quantity,
                imageUrl,
            }),
        });

        const data = await response.json();
        updateCartItemCount();
        if (response.ok) {
            alert("Product added to cart successfully!");
            return data;
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error("Server error:", err);
    }
}

async function trackOrder(trackingId) {
    const userId = JSON.parse(localStorage.getItem('user'))?.id;
    if (!userId) {
        return { success: false, message: "User not logged in" };
    }

    try {
        const response = await fetch(`https://fitsedit.tooliso.com/orders/track?user_id=${userId}&trackingId=${trackingId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                authorization: `Bearer ${localStorage.getItem('token')}`,
            }
        });

        const data = await response.json();
        if (response.ok) {
            return {
                success: true,
                order: data.order
            };
        } else {
            return {
                success: false,
                message: data.message
            };
        }
    } catch (err) {
        console.error("Error tracking order:", err);
        return {
            success: false,
            message: "Server error while tracking order"
        };
    }
}

async function fetchCartData(userId, token) {
    try {
        const response = await fetch(`https://fitsedit.tooliso.com/cart/getdata?user_id=${userId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            timeout: 5000
        });

        if (!response.ok) {
            if (response.status === 401) {
                return { error: "⚠️ Authentication failed. Please log in again." };
            }
            return { error: `⚠️ Failed to fetch cart (Status: ${response.status}). Please try again later.` };
        }

        const data = await response.json();
        return { data };
    } catch (error) {
        return { error: "⚠️ Network error. Please check your connection and try again." };
    }
}

function formatCartMessage(data) {
    if (data.length === 0) {
        return "🛒 Your cart is empty.";
    }

    let message = "🛍️ Your Cart Details:\n\n";
    data.forEach((product, index) => {
        message += `
${index + 1}. ${product.title.slice(0, 50)}...\n\n
- 🏷️ Price: $${product.price}\n\n
- 🔢 Quantity: ${product.quantity}\n\n
`;
    });

    return message;
}

function toggleChatbot() {
    document.querySelector(".chatbot-icon").classList.toggle("msg");
    const chatbotPopup = document.getElementById('chatbotPopup');
    chatbotPopup.classList.toggle('active');
    if (chatbotPopup.classList.contains('active')) {
        loadChatMessages();
    }
}

function loadChatMessages() {
    const history = loadChatHistory();
    const chatbotBody = document.querySelector('.chatbot-body');
    chatbotBody.innerHTML = '<div class="chatbot-message">Hello! Let me help you find the perfect product from our vast collection!</div>';

    history.forEach(entry => {
        if (entry.type === 'message') {
            addMessageToChat(entry.message,
                entry.sender === 'user' ? 'user-message' : 'bot-message',
                false
            );
        } else if (entry.type === 'products') {
            const productsContainer = document.createElement('div');
            productsContainer.className = 'product-recommendations';
            productsContainer.dataset.currentIndex = '0';

            entry.products.forEach((product, index) => {
                const productCard = document.createElement('div');
                productCard.className = `chatbot-product-card ${index === 0 ? 'active' : ''}`;
                productCard.dataset.index = index;
                productCard.innerHTML = `
                    <img src="${product.imageUrl}" alt="${product.title}" class="product-image">
                    <div class="product-info">
                        <h4>${product.title}</h4>
                        <p>${product.description}</p>
                        <p class="product-price">${product.price}</p>
                        <p class="product-reason"><em>${product.reason}</em></p>
                        <button class="view-product-btn">View Product</button>
                    </div>
                `;

                const addToCartButton = document.createElement('button');
                addToCartButton.className = 'view-product-btn';
                addToCartButton.textContent = '+ Add to Cart';

                addToCartButton.addEventListener('click', () => {
                    addToCart({
                        imageUrl: product.imageUrl,
                        title: product.title,
                        price: parseFloat(product.price.replace('$', '')),
                        id: product.id,
                        user_id: JSON.parse(localStorage.getItem('user')).id
                    });
                });

                const productInfoDiv = productCard.querySelector('.product-info');
                productInfoDiv.appendChild(addToCartButton);

                const viewProductButton = productCard.querySelector('.view-product-btn');
                viewProductButton.addEventListener('click', () => {
                    showProductPopup(product);
                });

                productsContainer.appendChild(productCard);
            });

            if (entry.products.length > 1) {
                const leftArrow = document.createElement('div');
                leftArrow.className = 'nav-arrow left';
                leftArrow.innerHTML = '<i class="fas fa-chevron-left"></i>';
                leftArrow.onclick = () => navigateProducts(productsContainer, -1);
                productsContainer.appendChild(leftArrow);

                const rightArrow = document.createElement('div');
                rightArrow.className = 'nav-arrow right';
                rightArrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
                rightArrow.onclick = () => navigateProducts(productsContainer, 1);
                productsContainer.appendChild(rightArrow);
            }

            chatbotBody.appendChild(productsContainer);
        }
    });
}

function navigateProducts(container, direction) {
    const currentIndex = parseInt(container.dataset.currentIndex);
    const cards = container.querySelectorAll('.chatbot-product-card');
    const newIndex = Math.max(0, Math.min(currentIndex + direction, cards.length - 1));

    cards[currentIndex].classList.remove('active');
    cards[newIndex].classList.add('active');
    container.dataset.currentIndex = newIndex;
}

function simulateThinking() {
    return new Promise(resolve => {
        const delay = Math.random() * 1000 + 1000;
        setTimeout(resolve, delay);
    });
}

function sendMessage(event) {
    if (event.key === 'Enter') {
        sendMessageCommon();
    }
}

function sendMessageClick() {
    sendMessageCommon();
}

async function sendMessageCommon() {
    const input = document.getElementById('chatbotInput');
    const message = input.value.trim();
    if (!message) return;

    addMessageToChat(message, 'user-message');
    saveChatHistory({
        type: 'message',
        sender: 'user',
        message: message,
        timestamp: new Date().toISOString()
    });
    input.value = '';

    const typingIndicator = addMessageToChat('Assistant is typing...', 'typing-indicator');

    try {
        const history = loadChatHistory();
        const conversationContext = history
            .filter(h => h.type === 'message')
            .slice(-3)
            .map(h => `${h.sender}: ${h.message}`)
            .join('\n');

        const intentPrompt = `
            You are an assistant for an e-commerce website selling clothing and accessories.
            The user is named ${JSON.parse(localStorage.getItem('user')).name}.
            Analyze the user's message to determine their intent and respond appropriately.
            Available product files:
            - beanies caps for men women.json
            - branded hand women bags.json
            - Formal Dresses_men.json
            - Formal Dresses_women.json
            - high end shoes for men.json
            - high end shoes for women.json
            - lather jackets men.json
            - lather jackets women.json
            - socks for men.json
            - socks for women.json
            - sunglasses mens.json
            - sunglasses womens.json
            - tshirts shirts for men.json
            - tshirts shirts for women.json
            
            User message: "${message}"
            Conversation history (last 3 messages): ${conversationContext}
            
            Determine the user's intent and respond in this JSON format:
            {
                "intent": "product_query" | "cart_query" | "track_order" | "general_query" | "product_detail" | "confirmation_response" | "list_categories",
                "relevantFile": "filename.json" or null,
                "responseText": "Your friendly response to the user, using their name (e.g., 'Hello ${JSON.parse(localStorage.getItem('user')).name}, ...').",
                "products": [] or [{"id": "asin", "title": "name", "description": "desc", "price": "$price", "imageUrl": "url", "reason": "why"}],
                "awaitingInput": "tracking_id" or "confirmation" or null
            }
            
            Guidelines:
            1. For product queries (e.g., "sunglasses", "jackets"), select the most relevant product file and suggest showing products.
            2. Detect query shifts (e.g., from "sunglasses" to "jackets") by prioritizing the current message.
            3. Handle typos (e.g., "jacketes" → "jackets") by suggesting corrections in the response.
            4. For price filters (e.g., "sunglasses under $100"), include only products with prices below the specified amount in the products array, formatted as "$price".
            5. For cart queries (e.g., "show cart"), set intent to "cart_query" and provide a placeholder response.
            6. For order tracking (e.g., "track order"), request a tracking ID and set awaitingInput to "tracking_id".
            7. For product details (e.g., "material of sunglasses"), set intent to "product_detail" and use the last relevant file if available.
            8. For confirmation responses (e.g., "yes", "show"), set intent to "confirmation_response" and include up to 5 products from the relevant file, respecting price filters if specified. Ensure products have valid id, title, description, price (as "$price"), imageUrl, and reason.
            9. For category listing (e.g., "list all categories"), set intent to "list_categories" and list all available categories.
            10. For general queries (e.g., "how to style"), provide a helpful response and suggest relevant products.
            11. Use the user's name in all responses and keep them gender-neutral.
            12. If the intent is unclear, default to "general_query" and ask for clarification.
            13. When returning products, ensure each has id, title, description, price (formatted as "$price"), imageUrl, and reason, and respect price constraints.
            14. Example: For "show me for men" after "sunglasses under $100", return products from "sunglasses mens.json" with prices under $100, e.g., {"id": "asin123", "title": "Polarized Sunglasses", "description": "Stylish shades", "price": "$50", "imageUrl": "url", "reason": "Affordable and stylish"}.
        `;

        const intentResponse = await callGeminiAPI(intentPrompt);
        const intentData = JSON.parse(intentResponse.match(/{[\s\S]*}/)[0]);
        typingIndicator.remove();

        if (intentData.intent === 'cart_query') {
            const userId = JSON.parse(localStorage.getItem('user')).id;
            const token = localStorage.getItem('token');
            const cartResponse = await fetchCartData(userId, token);
            if (cartResponse.error) {
                addMessageToChat(cartResponse.error, 'bot-message');
                saveChatHistory({
                    type: 'message',
                    sender: 'bot',
                    message: cartResponse.error,
                    timestamp: new Date().toISOString()
                });
            } else {
                const cartMessage = formatCartMessage(cartResponse.data);
                addMessageToChat(cartMessage, 'bot-message');
                saveChatHistory({
                    type: 'message',
                    sender: 'bot',
                    message: cartMessage,
                    timestamp: new Date().toISOString()
                });
            }
            return;
        }

        if (intentData.intent === 'list_categories') {
            addMessageToChat(intentData.responseText, 'bot-message');
            saveChatHistory({
                type: 'message',
                sender: 'bot',
                message: intentData.responseText,
                timestamp: new Date().toISOString()
            });
            return;
        }

        if (intentData.intent === 'track_order' && intentData.awaitingInput === 'tracking_id') {
            addMessageToChat(intentData.responseText, 'bot-message');
            saveChatHistory({
                type: 'message',
                sender: 'bot',
                message: intentData.responseText,
                timestamp: new Date().toISOString()
            });
            saveChatHistory({
                type: 'metadata',
                awaiting: 'tracking_id',
                timestamp: new Date().toISOString()
            });
            return;
        }

        if (intentData.intent === 'confirmation_response' && intentData.relevantFile) {
            await simulateThinking();
            const thinkingIndicator = addMessageToChat('Searching for the best options...', 'typing-indicator');
            let products = intentData.products;

            // Log products for debugging
            console.log("Products from Gemini:", products);

            // Fallback: Fetch products from cache/file if Gemini's product list is empty/invalid
            if (!products || products.length === 0 || !products.every(p => p.id && p.title && p.price && p.imageUrl)) {
                const cachedProducts = allProductsCache[intentData.relevantFile] || await fetchProducts(intentData.relevantFile);
                console.log("Cached Products:", cachedProducts);
                products = cachedProducts
                    .filter(p => p.asin && p.title && p.imageUrl)
                    .slice(0, 5)
                    .map(p => ({
                        id: p.asin,
                        title: p.title,
                        description: p.description || 'A stylish and quality product.',
                        price: typeof p.price === 'string' && p.price.includes('$') ? p.price : `$${parseFloat(p.price || 50).toFixed(2)}`,
                        imageUrl: p.imageUrl,
                        reason: `This ${p.title.toLowerCase()} matches your request for ${intentData.relevantFile.replace('.json', '').replace('./', '')}.`
                    }));
            }

            // Apply price filter if specified in conversation
            const priceMatch = conversationContext.match(/under \$(\d+)/i);
            if (priceMatch) {
                const maxPrice = parseFloat(priceMatch[1]);
                products = products.filter(p => {
                    const price = parseFloat(p.price.replace('$', '')) || 0;
                    return price <= maxPrice;
                });
                console.log("Filtered Products (under $" + maxPrice + "):", products);
            }

            if (products.length > 0) {
                await displayProducts(products, intentData.relevantFile);
                addMessageToChat(intentData.responseText, 'bot-message');
                saveChatHistory({
                    type: 'message',
                    sender: 'bot',
                    message: intentData.responseText,
                    timestamp: new Date().toISOString()
                });
                saveChatHistory({
                    type: 'products',
                    products: products,
                    timestamp: new Date().toISOString()
                });
            } else {
                addMessageToChat(`Sorry, ${JSON.parse(localStorage.getItem('user')).name}, I couldn’t find any products matching your criteria. Would you like to see all sunglasses or try another category?`, 'bot-message');
                saveChatHistory({
                    type: 'message',
                    sender: 'bot',
                    message: `Sorry, ${JSON.parse(localStorage.getItem('user')).name}, I couldn’t find any products matching your criteria. Would you like to see all sunglasses or try another category?`,
                    timestamp: new Date().toISOString()
                });
            }
            thinkingIndicator.remove();
            return;
        }

        if (intentData.intent === 'product_query' && intentData.relevantFile) {
            addMessageToChat(intentData.responseText, 'bot-message');
            saveChatHistory({
                type: 'message',
                sender: 'bot',
                message: intentData.responseText,
                timestamp: new Date().toISOString()
            });
            saveChatHistory({
                type: 'metadata',
                awaiting: 'confirmation',
                relevantFile: intentData.relevantFile,
                timestamp: new Date().toISOString()
            });
            return;
        }

        if (intentData.intent === 'product_detail') {
            const lastMetadata = history.find(h => h.type === 'metadata' && h.relevantFile)?.relevantFile;
            if (lastMetadata && intentData.relevantFile) {
                const products = allProductsCache[intentData.relevantFile] || await fetchProducts(intentData.relevantFile);
                const product = products.find(p => p.title.toLowerCase().includes(message.toLowerCase()));
                let detailResponse = intentData.responseText;
                if (product && message.toLowerCase().includes('material')) {
                    const material = product.material || 'not specified';
                    detailResponse = material === 'not specified' 
                        ? `I don’t have material details for the ${product.title}, ${JSON.parse(localStorage.getItem('user')).name}, but it’s designed for comfort and style. Would you like more information?`
                        : `The ${product.title} is made of ${material}, ${JSON.parse(localStorage.getItem('user')).name}. Would you like more details?`;
                }
                addMessageToChat(detailResponse, 'bot-message');
                saveChatHistory({
                    type: 'message',
                    sender: 'bot',
                    message: detailResponse,
                    timestamp: new Date().toISOString()
                });
            } else {
                addMessageToChat(intentData.responseText, 'bot-message');
                saveChatHistory({
                    type: 'message',
                    sender: 'bot',
                    message: intentData.responseText,
                    timestamp: new Date().toISOString()
                });
            }
            return;
        }

        // Handle tracking ID input
        const lastMetadata = history.find(h => h.type === 'metadata' && h.awaiting === 'tracking_id');
        if (lastMetadata) {
            const trackingResult = await trackOrder(message);
            if (trackingResult.success) {
                const { order } = trackingResult;
                const responseText = `
                    ${JSON.parse(localStorage.getItem('user')).name}, here are the details for your order (Tracking ID: ${order.trackingId}):
                    - Status: ${order.status}
                    - Total Amount: $${order.totalAmount.toFixed(2)}
                    - Order Date: ${new Date(order.orderDate).toLocaleDateString()}
                    - Items: ${order.items.map(item => item.title).join(', ')}
                    - Shipping Address: ${order.address}
                    Would you like to track another order or check out more products?
                `;
                addMessageToChat(responseText, 'bot-message');
                saveChatHistory({
                    type: 'message',
                    sender: 'bot',
                    message: responseText,
                    timestamp: new Date().toISOString()
                });
            } else {
                const responseText = `Sorry, ${JSON.parse(localStorage.getItem('user')).name}, ${trackingResult.message}. Please provide a valid tracking ID or ask about something else.`;
                addMessageToChat(responseText, 'bot-message');
                saveChatHistory({
                    type: 'message',
                    sender: 'bot',
                    message: responseText,
                    timestamp: new Date().toISOString()
                });
            }
            return;
        }

        // Default: general query or fallback
        addMessageToChat(intentData.responseText, 'bot-message');
        saveChatHistory({
            type: 'message',
            sender: 'bot',
            message: intentData.responseText,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error:', error);
        typingIndicator.remove();
        addMessageToChat(`Sorry, ${JSON.parse(localStorage.getItem('user')).name}, I encountered an error. Please try again!`, 'bot-message');
        saveChatHistory({
            type: 'message',
            sender: 'bot',
            message: `Sorry, ${JSON.parse(localStorage.getItem('user')).name}, I encountered an error. Please try again!`,
            timestamp: new Date().toISOString()
        });
    }
}

async function fetchProducts(relevantFile) {
    try {
        const response = await fetch(relevantFile);
        if (!response.ok) throw new Error(`Failed to fetch ${relevantFile}`);
        const products = await response.json();
        allProductsCache[relevantFile] = products;
        return products;
    } catch (error) {
        console.error('Error fetching product file:', error);
        return [];
    }
}

async function displayProducts(products, relevantFile) {
    const productsContainer = document.createElement('div');
    productsContainer.className = 'product-recommendations';
    productsContainer.dataset.currentIndex = '0';

    // Relaxed validation with defaults
    const uniqueProducts = products
        .filter(product => product.id && product.title)
        .map(product => ({
            id: product.id,
            title: product.title,
            description: product.description || 'A stylish and quality product.',
            price: typeof product.price === 'string' && product.price.includes('$') ? product.price : `$${parseFloat(product.price || 50).toFixed(2)}`,
            imageUrl: product.imageUrl || 'https://via.placeholder.com/150',
            reason: product.reason || `This matches your request for ${relevantFile.replace('.json', '').replace('./', '')}.`
        }));

    console.log("Products to Display:", uniqueProducts);

    if (uniqueProducts.length === 0) {
        addMessageToChat(`Sorry, ${JSON.parse(localStorage.getItem('user')).name}, I couldn’t find any products matching your criteria. Would you like to see all products in this category?`, 'bot-message');
        saveChatHistory({
            type: 'message',
            sender: 'bot',
            message: `Sorry, ${JSON.parse(localStorage.getItem('user')).name}, I couldn’t find any products matching your criteria. Would you like to see all products in this category?`,
            timestamp: new Date().toISOString()
        });
        return;
    }

    uniqueProducts.forEach((product, index) => {
        const productCard = document.createElement('div');
        productCard.className = `chatbot-product-card ${index === 0 ? 'active' : ''}`;
        productCard.dataset.index = index;
        productCard.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.title}" class="product-image">
            <div class="product-info">
                <h4>${product.title}</h4>
                <p>${product.description}</p>
                <p class="product-price">${product.price}</p>
                <p class="product-reason"><em>${product.reason}</em></p>
                <button class="view-product-btn" onclick='showProductPopup(${JSON.stringify(product)})'>View Product</button>
                <button class="view-product-btn add-to-cart-btn">+ Add to Cart</button>
            </div>
        `;
        productsContainer.appendChild(productCard);

        const addToCartButton = productCard.querySelector('.add-to-cart-btn');
        addToCartButton.addEventListener('click', () => {
            addToCart({
                imageUrl: product.imageUrl,
                title: product.title,
                price: parseFloat(product.price.replace('$', '')) || 0,
                id: product.id,
                user_id: JSON.parse(localStorage.getItem('user')).id
            });
        });
    });

    if (uniqueProducts.length > 1) {
        const leftArrow = document.createElement('div');
        leftArrow.className = 'nav-arrow left';
        leftArrow.innerHTML = '<i class="fas fa-chevron-left"></i>';
        leftArrow.onclick = () => navigateProducts(productsContainer, -1);
        productsContainer.appendChild(leftArrow);

        const rightArrow = document.createElement('div');
        rightArrow.className = 'nav-arrow right';
        rightArrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
        rightArrow.onclick = () => navigateProducts(productsContainer, 1);
        productsContainer.appendChild(rightArrow);
    }

    const chatbotBody = document.querySelector('.chatbot-body');
    chatbotBody.appendChild(productsContainer);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;

    saveChatHistory({
        type: 'products',
        products: uniqueProducts,
        timestamp: new Date().toISOString()
    });
}

async function callGeminiAPI(prompt, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 1000 }
                }),
            });
            if (!response.ok) throw new Error('API request failed');
            const data = await response.json();
            console.log("Gemini API Response:", data.candidates?.[0]?.content?.parts?.[0]?.text);
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I couldn\'t generate a response. Please try again.';
        } catch (error) {
            if (i === retries) {
                console.error('API Error after retries:', error);
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

function addMessageToChat(text, className, save = true) {
    const chatbotBody = document.querySelector('.chatbot-body');
    const newMessage = document.createElement('div');
    newMessage.className = `chatbot-message ${className}`;
    newMessage.textContent = className === 'user-message' ? `You: ${text}` : text;
    chatbotBody.appendChild(newMessage);
    if (className !== 'product-recommendations') {
        chatbotBody.scrollTop = chatbotBody.scrollHeight;
    }
    return newMessage;
}

async function showProductPopup(product) {
    const insightPrompt = `
        You are an enthusiastic e-commerce assistant. Generate a short, exciting comment about the user's product choice.
        The user is named ${JSON.parse(localStorage.getItem('user')).name}.
        Product: ${product.title}
        Keep it positive and engaging, max 1 sentence.
        Example: "Wow, ${JSON.parse(localStorage.getItem('user')).name}, you picked a stylish gem that's perfect for any occasion!"
    `;

    let insight = `Wow, ${JSON.parse(localStorage.getItem('user')).name}, you've chosen an amazing product!`;
    try {
        const insightResponse = await callGeminiAPI(insightPrompt);
        insight = insightResponse.trim();
    } catch (error) {
        console.error('Error generating insight:', error);
    }

    document.getElementById('popupImage').src = product.imageUrl;
    document.getElementById('popupImage').alt = product.title;
    document.getElementById('popupTitle').textContent = product.title;
    document.getElementById('popupPrice').textContent = product.price;
    document.getElementById('popupInsight').textContent = insight;

    document.getElementById('productPopup').classList.add('active');
    document.getElementById('popupOverlay').classList.add('active');
}

function closePopup() {
    document.getElementById('productPopup').classList.remove('active');
    document.getElementById('popupOverlay').classList.remove('active');
}

async function renderCategoryButtons() {
    const categoryButtons = document.getElementById('categoryButtons');
    categoryButtons.innerHTML = '';

    const categories = productFiles.map(file => ({
        file,
        name: file.toLocaleLowerCase().replace('.json', '').replace('./', '').replace(/_/g, ' ').replace("mens","men").replace("womens","women").replace("lather","leather")
    }));

    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-button';
        button.textContent = category.name
        button.onclick = () => renderProductsByCategory(category.file);
        categoryButtons.appendChild(button);
    });

 

    categoryButtons.style.transform = 'translateX(0px)';
    document.querySelector('.category-nav-arrow.left').style.display = 'flex';
    document.querySelector('.category-nav-arrow.right').style.display = 'flex';
}

async function updateCartItemCount() {
    let token = localStorage.getItem("token");
    let userId = JSON.parse(localStorage.getItem("user")).id;
    let cartItemsCount = document.getElementById("cartItemsCount");
    try {
        const response = await fetch(`https://fitsedit.tooliso.com/cart/count?user_id=${userId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        const data = await response.json();

        if (response.ok) {
            cartItemsCount.textContent = data.count || 0;
        } else {
            console.error("Failed to fetch cart count:", data.message);
            cartItemsCount.textContent = "0";
        }
    } catch (error) {
        console.error("Error fetching cart count:", error);
        cartItemsCount.textContent = "0";
    }
}

function scrollCategories(direction) {
    const categoryButtons = document.getElementById('categoryButtons');
    const buttonWidth = categoryButtons.querySelector('.category-button')?.offsetWidth + 10 || 100;
    const containerWidth = document.querySelector('.category-buttons-container').offsetWidth;
    const maxScroll = (categoryButtons.children.length * buttonWidth) - containerWidth;

    let currentScroll = 0;
    const transform = categoryButtons.style.transform;
    if (transform && transform.includes('translateX')) {
        const match = transform.match(/translateX\(-?(\d*\.?\d*)px\)/);
        currentScroll = match ? parseFloat(match[1]) : 0;
    }

    currentScroll += direction * buttonWidth * 3;
    currentScroll = Math.max(0, Math.min(currentScroll, maxScroll));

    categoryButtons.style.transform = `translateX(-${currentScroll}px)`;

    document.querySelector('.category-nav-arrow.left').style.display = 'flex';
    document.querySelector('.category-nav-arrow.right').style.display = 'flex';
}

async function renderProductsByCategory(file, limit = Infinity) {
    const productGrid = document.getElementById('productGrid');
    productGrid.innerHTML = '<p>Loading products...</p>';

    try {
        const products = allProductsCache[file] || await fetchProducts(file);
        productGrid.innerHTML = '';

        const minPrice = 9;
        const maxPrice = 100;

        for (const product of products.slice(0, limit)) {
            const priceGenerated = Math.floor(Math.random() * (maxPrice - minPrice + 1)) + minPrice;
            const price = product.price ? parseFloat(product.price.toString().replace('$', '')) : priceGenerated;
            const formattedPrice = `$${parseFloat(price).toFixed(2)}`;

            const productCard = document.createElement('div');
            productCard.className = 'product-card';

            const img = document.createElement('img');
            img.src = product.imageUrl || 'https://via.placeholder.com/150';
            img.alt = product.title || 'Product Image';
            productCard.appendChild(img);

            const title = document.createElement('p');
            title.textContent = (product.title || 'Untitled Product').slice(0, 100);
            productCard.appendChild(title);

            const priceDiv = document.createElement('div');
            priceDiv.className = 'price';
            priceDiv.textContent = `Price: ${formattedPrice}`;
            productCard.appendChild(priceDiv);

            const button = document.createElement('button');
            button.className = 'add-to-cart';
            button.textContent = 'Add to Cart';
            button.addEventListener('click', () => {
                addToCart({
                    imageUrl: product.imageUrl,
                    title: product.title,
                    price: price,
                    id: product.asin,
                    user_id: JSON.parse(localStorage.getItem('user')).id
                });
            });
            productCard.appendChild(button);

            productGrid.appendChild(productCard);
        }
    } catch (error) {
        console.error('Error rendering products:', error);
        productGrid.innerHTML = '<p>Failed to load products. Please try again later.</p>';
    }
}

async function renderMixedProducts(limit = 100) {
    const productGrid = document.getElementById('productGrid');
    productGrid.innerHTML = '<p>Loading products...</p>';

    try {
        let allProducts = [];
        for (const file in allProductsCache) {
            allProducts = allProducts.concat(allProductsCache[file]);
        }

        for (let i = allProducts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allProducts[i], allProducts[j]] = [allProducts[j], allProducts[i]];
        }

        productGrid.innerHTML = '';

        const minPrice = 9;
        const maxPrice = 100;

        for (const product of allProducts.slice(0, limit)) {
            const priceGenerated = Math.floor(Math.random() * (maxPrice - minPrice + 1)) + minPrice;
            const price = product.price ? parseFloat(product.price.toString().replace('$', '')) : priceGenerated;
            const formattedPrice = `$${parseFloat(price).toFixed(2)}`;

            const productCard = document.createElement('div');
            productCard.className = 'product-card';

            const img = document.createElement('img');
            img.src = product.imageUrl || 'https://via.placeholder.com/150';
            img.alt = product.title || 'Product Image';
            productCard.appendChild(img);

            const title = document.createElement('p');
            title.textContent = (product.title || 'Untitled Product').slice(0, 100);
            productCard.appendChild(title);

            const priceDiv = document.createElement('div');
            priceDiv.className = 'price';
            priceDiv.textContent = `Price: ${formattedPrice}`;
            productCard.appendChild(priceDiv);

            const button = document.createElement('button');
            button.className = 'add-to-cart';
            button.textContent = 'Add to Cart';
            button.addEventListener('click', () => {
                addToCart({
                    imageUrl: product.imageUrl || 'https://via.placeholder.com/150',
                    title: product.title || 'Untitled Product',
                    price: price,
                    id: product.asin,
                    user_id: JSON.parse(localStorage.getItem('user'))?.id
                });
            });
            productCard.appendChild(button);

            productGrid.appendChild(productCard);
        }
    } catch (error) {
        console.error('Error rendering mixed products:', error);
        productGrid.innerHTML = '<p>Failed to load products. Please try again later.</p>';
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    await Promise.all(productFiles.map(async file => {
        try {
            const response = await fetch(file);
            if (!response.ok) throw new Error(`Failed to fetch ${file}`);
            allProductsCache[file] = await response.json();
        } catch (error) {
            console.error(`Error preloading ${file}:`, error);
        }
    }));
    updateCartItemCount();
    renderCategoryButtons();
    renderMixedProducts();
    document.getElementById('popupOverlay').addEventListener('click', closePopup);
});

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../login.html';
}

let token = localStorage.getItem("token");
if (!token) {
    window.location.href = "../login.html";
}