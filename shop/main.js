let allProductsCache = {};
let queryContext = {};
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
    console.log(history);
    
    localStorage.setItem('chatHistory', JSON.stringify(history));
}

function loadQueryContext() {
    const context = localStorage.getItem('queryContext');
    return context ? JSON.parse(context) : {
        category: null,
        shownProductIds: [],
        lastQuery: null,
        awaitingConfirmation: false,
        pendingQuery: null,
        lastShownCategory: null,
        lastResponse: null,
        awaitingTrackingId: false
    };
}

function saveQueryContext(context) {
    localStorage.setItem('queryContext', JSON.stringify(context));
}

async function addToCart(product) {
    let quantity = 1; // Default quantity
    const { id, title, price, imageUrl, user_id } = product;

    console.log(id, title, price, imageUrl, user_id);
    
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

async function fetchCartContents() {
    const userId = JSON.parse(localStorage.getItem('user'))?.id;
    const token = localStorage.getItem('token');
    if (!userId || !token) {
        return { success: false, message: 'User not logged in' };
    }

    try {
        const response = await fetch(`https://fitsedit.tooliso.com/cart/getdata?user_id=${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (response.ok) {
            return { success: true, items: data || [] }; // Cart page expects array directly
        } else {
            return { success: false, message: data.message || 'Failed to fetch cart contents' };
        }
    } catch (error) {
        console.error('Error fetching cart contents:', error);
        return { success: false, message: 'Server error while fetching cart contents' };
    }
}

function getChatContext() {
    const history = loadChatHistory();
    const context = loadQueryContext();
    let contextString = history
        .filter(h => h.type === 'message')
        .map(h => `${h.sender}: ${h.message}`)
        .join('\n');
    if (context.lastQuery) {
        contextString += `\nMost recent user query: ${context.lastQuery}`;
    }
    if (context.category) {
        contextString += `\nCurrent product category (if still relevant): ${context.category || 'none'}`;
    }
    if (context.lastShownCategory) {
        contextString += `\nLast shown category: ${context.lastShownCategory}`;
    }
    if (context.awaitingTrackingId) {
        contextString += `\nAwaiting tracking ID: true`;
    }
    return contextString;
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
                        price: parseInt(product.price.replace('$', '')),
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
        const delay = Math.random() * 1000 + 1000; // 1-2 seconds
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

async function handleProductDetailQuery(userMessage, relevantFile, productTitle) {
    relevantFile = relevantFile.includes('.json') ? relevantFile : relevantFile + '.json';
    const products = allProductsCache[relevantFile] || [];
    
    const product = products.find(p => p.title.toLowerCase().includes(productTitle.toLowerCase()));
    
    if (!product) {
        return {
            responseText: "I couldn’t find that specific product. Could you clarify or ask about another item?",
            products: []
        };
    }

    if (userMessage.toLowerCase().includes('material')) {
        const material = product.material || 'not specified in the product details';
        if (material === 'not specified in the product details') {
            return {
                responseText: `I don’t have material details for the ${product.title}, but it’s designed for comfort and style. Would you like more information about its features?`,
                products: []
            };
        }
        return {
            responseText: `The ${product.title} is made of ${material}. Would you like more details about this product or something else?`,
            products: []
        };
    }

    return {
        responseText: "I’m not sure which detail you’re asking about. Could you specify (e.g., material, size)?",
        products: []
    };
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
        queryContext = loadQueryContext();

        // Handle tracking ID input
        if (queryContext.awaitingTrackingId) {
            typingIndicator.remove();
            queryContext.awaitingTrackingId = false;
            saveQueryContext(queryContext);

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

        // Handle confirmation responses
        if (queryContext.awaitingConfirmation) {
            const affirmativeResponses = ['yes', 'sure', 'okay', 'yep', 'show', 'please', 'yha', 'yeah', 'ok', 'yup'];
            const messageLower = message.toLowerCase();
            if (affirmativeResponses.some(word => messageLower.includes(word))) {
                typingIndicator.remove();
                const acknowledgment = `Got it, let me find those ${queryContext.category.replace('.json', '').replace('./', '')} for you!`;
                addMessageToChat(acknowledgment, 'bot-message');
                saveChatHistory({
                    type: 'message',
                    sender: 'bot',
                    message: acknowledgment,
                    timestamp: new Date().toISOString()
                });

                await simulateThinking();
                const thinkingIndicator = addMessageToChat('Searching for the best options...', 'typing-indicator');
                await displayPendingProducts(queryContext.pendingQuery, queryContext.category);
                thinkingIndicator.remove();
                queryContext.awaitingConfirmation = false;
                queryContext.pendingQuery = null;
                queryContext.lastResponse = 'confirmed';
                saveQueryContext(queryContext);
                return;
            } else {
                typingIndicator.remove();
                queryContext.awaitingConfirmation = false;
                queryContext.pendingQuery = null;
                queryContext.lastResponse = 'declined';
                saveQueryContext(queryContext);
                addMessageToChat('Alright, let me know how else I can assist you!', 'bot-message');
                saveChatHistory({
                    type: 'message',
                    sender: 'bot',
                    message: 'Alright, let me know how else I can assist you!',
                    timestamp: new Date().toISOString()
                });
                return;
            }
        }

        // Check for product detail query
        if (queryContext.lastShownCategory && message.toLowerCase().includes('material')) {
            typingIndicator.remove();
            const productTitle = queryContext.lastQuery || message;
            const detailResponse = await handleProductDetailQuery(message, queryContext.lastShownCategory, productTitle);
            addMessageToChat(detailResponse.responseText, 'bot-message');
            saveChatHistory({
                type: 'message',
                sender: 'bot',
                message: detailResponse.responseText,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Check for order tracking query
        const trackingKeywords = ['track', 'order status', 'where is my order', 'order tracking', 'delivery status'];
        if (trackingKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
            typingIndicator.remove();
            queryContext.awaitingTrackingId = true;
            saveQueryContext(queryContext);
            const responseText = `Please provide your tracking ID, ${JSON.parse(localStorage.getItem('user')).name}, and I'll check the status of your order.`;
            addMessageToChat(responseText, 'bot-message');
            saveChatHistory({
                type: 'message',
                sender: 'bot',
                message: responseText,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Check for cart content query
        const cartKeywords = ["what's in my cart", 'cart contents', 'show my cart', 'cart items', 'check my cart', 'see my cart'];
        if (cartKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
            typingIndicator.remove();
            const cartResult = await fetchCartContents();
            const userName = JSON.parse(localStorage.getItem('user')).name;
            if (cartResult.success && cartResult.items.length > 0) {
                const itemList = cartResult.items.map(item => `- ${item.title} ($${item.price.toFixed(2)} x ${item.quantity})`).join('\n');
                const responseText = `${userName}, here’s what’s in your cart:\n${itemList}\nWould you like to add more items or proceed to checkout?`;
                addMessageToChat(responseText, 'bot-message');
                saveChatHistory({
                    type: 'message',
                    sender: 'bot',
                    message: responseText,
                    timestamp: new Date().toISOString()
                });
            } else if (cartResult.success) {
                const responseText = `${userName}, your cart is empty. Would you like to browse some products to add?`;
                addMessageToChat(responseText, 'bot-message');
                saveChatHistory({
                    type: 'message',
                    sender: 'bot',
                    message: responseText,
                    timestamp: new Date().toISOString()
                });
            } else {
                const responseText = `Sorry, ${userName}, ${cartResult.message}. Please try again later or visit the cart page to view your items.`;
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

        const fileAnalysisPrompt = `
            You are an assistant for an e-commerce website.
            Analyze the user's message and determine:
            1. Is this a product-related query (yes/no)?
            2. If yes, which of these product files is most relevant (choose only one most relevant file or say "none")?
            3. If the message explicitly mentions a new category (e.g., "glasses", "bags"), prioritize that category over the previous one, even if it's a follow-up.
            4. Only assume it's a follow-up referring to the last category for vague queries like "show me more," "more," or "show."
            5. The user who is talking with you is named ${JSON.parse(localStorage.getItem('user')).name}; use this name in your response and avoid gender-specific terms like "sir" or "ma'am".
            Product files available:
            - beanies caps for men women
            - branded hand women bags
            - Formal Dresses_men
            - Formal Dresses_women
            - high end shoes for men
            - high end shoes for women
            - lather jackets men
            - lather jackets women
            - socks for men
            - socks for women
            - sunglasses mens
            - sunglasses womens
            - tshirts shirts for men
            - tshirts shirts for women
            
            User message: "${message}"
            Conversation history: ${getChatContext()}
            
            Respond in this exact JSON format: 
            {
                "isProductQuery": true/false,
                "relevantFile": "filename.json" or "none",
                "isFollowUp": true/false
            }
        `;

        const fileAnalysisResponse = await callGeminiAPI(fileAnalysisPrompt);
        let fileAnalysis;

        try {
            const jsonStart = fileAnalysisResponse.indexOf('{');
            const jsonEnd = fileAnalysisResponse.lastIndexOf('}') + 1;
            fileAnalysis = JSON.parse(fileAnalysisResponse.slice(jsonStart, jsonEnd));
        } catch (e) {
            console.error("Error parsing file analysis response:", e);
            fileAnalysis = { isProductQuery: false, relevantFile: "none", isFollowUp: false };
        }

        typingIndicator.remove();

        // Reset category if new product query with different category
        if (fileAnalysis.isProductQuery && fileAnalysis.relevantFile !== "none" && fileAnalysis.relevantFile !== queryContext.category) {
            queryContext.category = fileAnalysis.relevantFile;
            queryContext.shownProductIds = [];
        }

        if (fileAnalysis.isFollowUp && queryContext.category) {
            fileAnalysis.isProductQuery = true;
            fileAnalysis.relevantFile = queryContext.category;
        }

        if (fileAnalysis.isProductQuery && fileAnalysis.relevantFile !== "none") {
            queryContext.lastQuery = message;
            saveQueryContext(queryContext);
            await handleProductQuery(message, fileAnalysis.relevantFile);
        } else {
            await handleGeneralQuery(message);
        }
    } catch (error) {
        console.error('Error:', error);
        typingIndicator.remove();
        addMessageToChat('Sorry, I encountered an error processing your request. Please try again.', 'bot-message');
        saveChatHistory({
            type: 'message',
            sender: 'bot',
            message: 'Sorry, I encountered an error processing your request. Please try again.',
            timestamp: new Date().toISOString()
        });
    }
}

async function handleProductQuery(userMessage, relevantFile) {
    relevantFile = relevantFile.includes('.json') ? relevantFile : relevantFile + '.json';
    if (!allProductsCache[relevantFile]) {
        try {
            const response = await fetch(relevantFile);
            if (!response.ok) throw new Error(`Failed to fetch ${relevantFile}`);
            allProductsCache[relevantFile] = await response.json();
        } catch (error) {
            console.error('Error fetching product file:', error);
            addMessageToChat('Sorry, I couldn\'t access the product information. Please try again later.', 'bot-message');
            saveChatHistory({
                type: 'message',
                sender: 'bot',
                message: 'Sorry, I couldn\'t access the product information. Please try again later.',
                timestamp: new Date().toISOString()
            });
            return;
        }
    }

    const userName = JSON.parse(localStorage.getItem('user')).name;
    const confirmationMessage = `Great, ${userName}, we have some awesome ${relevantFile.replace('.json', '').replace('./', '')} matching your request! Would you like me to show them?`;
    addMessageToChat(confirmationMessage, 'bot-message');
    saveChatHistory({
        type: 'message',
        sender: 'bot',
        message: confirmationMessage,
        timestamp: new Date().toISOString()
    });

    queryContext.awaitingConfirmation = true;
    queryContext.pendingQuery = userMessage;
    saveQueryContext(queryContext);
}

async function displayPendingProducts(userMessage, relevantFile) {
    relevantFile = relevantFile.includes('.json') ? relevantFile : relevantFile + '.json';
    const products = allProductsCache[relevantFile];
    const chatContext = getChatContext();
    queryContext = loadQueryContext();
    const priceThreshold = chatContext.includes('more then 10$') ? 10 : 0;

    const productPrompt = `
        You are an e-commerce assistant named Alex helping a customer find products.
        Here is the conversation history for context:
        ${chatContext}
        Here are products from our "${relevantFile.replace('.json', '').replace('./', '')}" collection:
        ${JSON.stringify(products, null, 2)}
        The user asked: "${userMessage}"
        Previously shown product IDs: ${JSON.stringify(queryContext.shownProductIds || [])}
        Please:
        1. Select up to 5 relevant products that match the user's request, excluding previously shown products (based on product IDs if available, or titles otherwise).
        2. Filter products with a price greater than ${priceThreshold} if specified, otherwise show a mix of prices.
        3. Consider price, features, user's implied needs (e.g., caps, bags, sunglasses), and conversation history.
        4. If the user mentioned caps, prioritize baseball caps, beanies, or sun hats.
        5. If the user mentioned bags, prioritize handbags or similar accessories.
        6. If the user mentioned sunglasses and specified styles like aviators or wayfarers, prioritize those.
        7. For follow-up requests like "show me more," select new products not previously shown.
        8. If no products match or an error occurs, provide a fallback message suggesting alternative categories.
        9. The user who is talking with you is named ${JSON.parse(localStorage.getItem('user')).name}; use this name in your response and avoid gender-specific terms like "sir" or "ma'am".
        Return your response in this exact JSON format:
        {
            "responseText": "Your friendly response to the user explaining the recommendations, referencing past conversation if relevant (e.g., 'You asked for sunglasses, here are five more stylish options, ${JSON.parse(localStorage.getItem('user')).name}!').",
            "products": [
                {
                    "id": "asin -> product ID",
                    "title": "Product name",
                    "description": "Brief description",
                    "price": "Price",
                    "imageUrl": "Image URL",
                    "reason": "Why this matches the user's needs"
                }
            ]
        }
    `;

    try {
        const productResponse = await callGeminiAPI(productPrompt);
        const jsonStart = productResponse.indexOf('{');
        const jsonEnd = productResponse.lastIndexOf('}') + 1;
        const responseData = JSON.parse(productResponse.slice(jsonStart, jsonEnd));

        if (!responseData.products || responseData.products.length === 0) {
            addMessageToChat('I couldn’t find more products matching your request. Would you like to see items from another category, like bags or caps?', 'bot-message');
            saveChatHistory({
                type: 'message',
                sender: 'bot',
                message: 'I couldn’t find more products matching your request. Would you like to see items from another category, like bags or caps?',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const productsContainer = document.createElement('div');
        productsContainer.className = 'product-recommendations';
        productsContainer.dataset.currentIndex = '0';

        const uniqueProducts = responseData.products.filter(product =>
            !queryContext.shownProductIds.includes(product.id || product.title)
        );

        if (uniqueProducts.length === 0) {
            addMessageToChat('I’ve shown you all the available products in this category. Would you like to see something else?', 'bot-message');
            saveChatHistory({
                type: 'message',
                sender: 'bot',
                message: 'I’ve shown you all the available products in this category. Would you like to see something else?',
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
            queryContext.shownProductIds.push(product.id || product.title);
        
            const addToCartButton = productCard.querySelector('.add-to-cart-btn');
            addToCartButton.addEventListener('click', () => {
                addToCart({
                    imageUrl: product.imageUrl,
                    title: product.title,
                    price: parseInt(product.price.replace('$', '')) || 0,
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

        document.querySelector('.chatbot-body').appendChild(productsContainer);

        saveChatHistory({
            type: 'products',
            products: uniqueProducts,
            timestamp: new Date().toISOString()
        });

        queryContext.lastShownCategory = queryContext.category;
        saveQueryContext(queryContext);

        addMessageToChat('What do you think of these? Use the arrows to browse, or let me know if you want more or something different.', 'bot-message');
        saveChatHistory({
            type: 'message',
            sender: 'bot',
            message: 'What do you think of these? Use the arrows to browse, or let me know if you want more or something different.',
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error("Error parsing product response:", e);
        addMessageToChat('I found some products that might interest you, but had trouble displaying them properly. Try asking for a different category or specific style.', 'bot-message');
        saveChatHistory({
            type: 'message',
            sender: 'bot',
            message: 'I found some products that might interest you, but had trouble displaying them properly. Try asking for a different category or specific style.',
            timestamp: new Date().toISOString()
        });
    }
}

async function handleGeneralQuery(userMessage) {
    const chatContext = getChatContext();
    const generalPrompt = `
        You are a helpful assistant for an e-commerce website that sells clothing and accessories.
        The user who is talking with you is named ${JSON.parse(localStorage.getItem('user')).name}; use this name in your response and avoid gender-specific terms like "sir" or "ma'am".
        Here is the conversation history for context:
        ${chatContext}
        The user asked: "${userMessage}"
        Please provide a helpful response, referencing past conversation if relevant (e.g., 'You were looking for sunglasses, would you like to see more, ${JSON.parse(localStorage.getItem('user')).name}?').
        If the query is related to products we might sell (like fashion advice, styling tips, etc.),
        mention that we have relevant products and suggest they ask about specific items like sunglasses, bags, or caps.
        Keep your response friendly, concise (2-3 sentences max), and engaging.
    `;

    const response = await callGeminiAPI(generalPrompt);
    addMessageToChat(response, 'bot-message');
    saveChatHistory({
        type: 'message',
        sender: 'bot',
        message: response,
        timestamp: new Date().toISOString()
    });
}

async function callGeminiAPI(prompt) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: 1000
                }
            }),
        });
        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I couldn\'t generate a response. Please try again.';
    } catch (error) {
        console.error('API Error:', error);
        throw error;
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
        Product: ${product.title}
        Keep it positive and engaging, max 1 sentence.
        Example: "Wow, you picked a stylish gem that's perfect for any occasion, ${JSON.parse(localStorage.getItem('user')).name}!"
    `;

    let insight = `Wow, you've chosen an amazing product, ${JSON.parse(localStorage.getItem('user')).name}!`;
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
        name: file.replace('.json', '').replace('./', '').replace(/_/g, ' ')
    }));

    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-button';
        button.textContent = category.name;
        button.onclick = () => renderProductsByCategory(category.file);
        categoryButtons.appendChild(button);
    });

    const mixedButton = document.createElement('button');
    mixedButton.className = 'category-button';
    mixedButton.textContent = 'Mixed Products (100)';
    mixedButton.onclick = renderMixedProducts;
    categoryButtons.appendChild(mixedButton);

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
      console.log(data);
      
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
        const products = allProductsCache[file];
        productGrid.innerHTML = '';

        const minPrice = 9;
        const maxPrice = 100;

        for (const product of products.slice(0, limit)) {
            const priceGenerated = Math.floor(Math.random() * (maxPrice - minPrice + 1)) + minPrice;
            if (product.price && typeof product.price === 'string' && product.price.includes('$')) {
                product.price = parseFloat(product.price.replace('$', ''));
            }
            const price = product.price ? product.price : priceGenerated;
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
            if (product.price && typeof product.price === 'string' && product.price.includes('$')) {
                product.price = parseFloat(product.price.replace('$', ''));
            }
            const price = product.price ? product.price : priceGenerated;
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