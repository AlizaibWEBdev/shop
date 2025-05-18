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
        awaitingTrackingId: false,
        currentCartItems: [] // Added to track cart items
    };
}

function saveQueryContext(context) {
    localStorage.setItem('queryContext', JSON.stringify(context));
}

async function getCartItems() {
    const userId = JSON.parse(localStorage.getItem('user'))?.id;
    if (!userId) return [];

    try {
        const response = await fetch(`https://fitsedit.tooliso.com/cart/getdata?user_id=${userId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem('token')}`,
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            const data = await response.json();
            queryContext.currentCartItems = data;
            saveQueryContext(queryContext);
            return data;
        }
        return [];
    } catch (error) {
        console.error("Error fetching cart:", error);
        return [];
    }
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
        await getCartItems(); // Refresh cart items in context
        if (response.ok) {
            showToast("Product added to cart successfully!", "success");
            return data;
        } else {
            showToast(data.message, "error");
        }
    } catch (err) {
        console.error("Server error:", err);
        showToast("Failed to add product to cart", "error");
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

function getChatContext() {
    const history = loadChatHistory();
    const context = loadQueryContext();
    let contextString = history
        .filter(h => h.type === 'message')
        .map(h => `${h.sender}: ${h.message}`)
        .join('\n');
    
    if (context.category || context.lastQuery) {
        contextString += `\nCurrent product category: ${context.category || 'none'}\nLast query: ${context.lastQuery || 'none'}`;
    }
    if (context.lastShownCategory) {
        contextString += `\nLast shown category: ${context.lastShownCategory}`;
    }
    if (context.awaitingTrackingId) {
        contextString += `\nAwaiting tracking ID: true`;
    }
    
    // Add cart information to context
    if (context.currentCartItems && context.currentCartItems.length > 0) {
        contextString += `\nCart contains: ${context.currentCartItems.map(item => `${item.title} (${item.quantity}x)`).join(', ')}`;
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
            renderProductCards(entry.products);
        }
    });
}

function renderProductCards(products) {
    const chatbotBody = document.querySelector('.chatbot-body');
    const productsContainer = document.createElement('div');
    productsContainer.className = 'product-recommendations';
    productsContainer.dataset.currentIndex = '0';

    products.forEach((product, index) => {
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

    if (products.length > 1) {
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

async function handleProductDetailQuery(userMessage, relevantFile, productTitle) {
    relevantFile = relevantFile.includes('.json') ? relevantFile : relevantFile + '.json';
    const products = allProductsCache[relevantFile] || [];
    
    const product = products.find(p => p.title.toLowerCase().includes(productTitle.toLowerCase()));
    
    if (!product) {
        return {
            responseText: "I couldn't find that specific product. Could you clarify or ask about another item?",
            products: []
        };
    }

    if (userMessage.toLowerCase().includes('material')) {
        const material = product.material || 'not specified in the product details';
        if (material === 'not specified in the product details') {
            return {
                responseText: `I don't have material details for the ${product.title}, but it's designed for comfort and style. Would you like more information about its features?`,
                products: []
            };
        }
        return {
            responseText: `The ${product.title} is made of ${material}. Would you like more details about this product or something else?`,
            products: []
        };
    }

    return {
        responseText: "I'm not sure which detail you're asking about. Could you specify (e.g., material, size)?",
        products: []
    };
}

async function sendMessageCommon() {
    const input = document.getElementById('chatbotInput');
    const message = input.value.trim();
    if (!message) return;

    const userName = JSON.parse(localStorage.getItem('user'))?.name || '';
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
                    ${userName}, here are the details for your order (Tracking ID: ${order.trackingId}):
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
                const responseText = `Sorry, ${userName}, ${trackingResult.message}. Please provide a valid tracking ID or ask about something else.`;
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

        // Handle cart inquiries
        const cartKeywords = ['cart', 'whats in my cart', 'my cart', 'shopping cart'];
        if (cartKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
            typingIndicator.remove();
            await getCartItems(); // Refresh cart items
            
            if (queryContext.currentCartItems && queryContext.currentCartItems.length > 0) {
                const cartItemsText = queryContext.currentCartItems.map(item => 
                    `${item.title} (${item.quantity}x) - $${(item.price * item.quantity).toFixed(2)}`
                ).join('\n');
                
                const total = queryContext.currentCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                
                const responseText = `${userName}, your cart contains:\n${cartItemsText}\n\nTotal: $${total.toFixed(2)}\n\nWould you like to proceed to checkout or continue shopping?`;
                addMessageToChat(responseText, 'bot-message');
                saveChatHistory({
                    type: 'message',
                    sender: 'bot',
                    message: responseText,
                    timestamp: new Date().toISOString()
                });
            } else {
                const responseText = `${userName}, your cart is currently empty. Would you like to browse some products?`;
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
            const negativeResponses = ['no', 'not now', 'later', 'nope', 'stop', 'done'];
            const messageLower = message.toLowerCase();
            
            if (affirmativeResponses.some(word => messageLower.includes(word))) {
                typingIndicator.remove();
                const acknowledgment = `${userName ? userName + ', ' : ''}Let me find those ${queryContext.category.replace('.json', '').replace('./', '')} for you!`;
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
            } else if (negativeResponses.some(word => messageLower.includes(word))) {
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

        // Check for product detail query (e.g., material, size)
        if (queryContext.lastShownCategory && (message.toLowerCase().includes('material') || message.toLowerCase().includes('size'))) {
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
            const responseText = `Please provide your tracking ID, ${userName}, and I'll check the status of your order.`;
            addMessageToChat(responseText, 'bot-message');
            saveChatHistory({
                type: 'message',
                sender: 'bot',
                message: responseText,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Check for clear intent to switch categories
        const switchKeywords = ['show me', 'i want', 'looking for', 'now please show me'];
        const productCategories = productFiles.map(f => f.replace('.json', '').replace('./', ''));
        
        if (switchKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
            const requestedCategory = productCategories.find(cat => 
                message.toLowerCase().includes(cat.toLowerCase())
            );
            
            if (requestedCategory) {
                typingIndicator.remove();
                queryContext.category = `./${requestedCategory}.json`;
                queryContext.lastQuery = message;
                queryContext.shownProductIds = [];
                saveQueryContext(queryContext);
                
                const acknowledgment = `${userName ? userName + ', ' : ''}I'll show you ${requestedCategory} instead.`;
                addMessageToChat(acknowledgment, 'bot-message');
                saveChatHistory({
                    type: 'message',
                    sender: 'bot',
                    message: acknowledgment,
                    timestamp: new Date().toISOString()
                });

                await simulateThinking();
                const thinkingIndicator = addMessageToChat('Searching for the best options...', 'typing-indicator');
                await displayPendingProducts(message, queryContext.category);
                thinkingIndicator.remove();
                return;
            }
        }

        const fileAnalysisPrompt = `
            You are an assistant for an e-commerce website.
            Analyze the user's message and determine:
            1. Is this a product-related query (yes/no)?
            2. If yes, which of these product files is most relevant (choose only one most relevant file or say "none")?
            3. If the message is a follow-up like "show me more," "more," or "show," assume it refers to the last product category.
            4. The user who is talking with you is named ${userName} - use this name in your response.
            5. Consider if the user wants to switch categories (e.g., from shoes to glasses).
            
            Product files available:
            ${productFiles.map(f => `- ${f.replace('.json', '').replace('./', '')}`).join('\n')}
            
            User message: "${message}"
            Conversation history: ${getChatContext()}
            
            Respond in this exact JSON format: 
            {
                "isProductQuery": true/false,
                "relevantFile": "filename.json" or "none",
                "isFollowUp": true/false,
                "shouldSwitchCategory": true/false
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
            fileAnalysis = { isProductQuery: false, relevantFile: "none", isFollowUp: false, shouldSwitchCategory: false };
        }

        typingIndicator.remove();

        if (fileAnalysis.isFollowUp && queryContext.category && !fileAnalysis.shouldSwitchCategory) {
            fileAnalysis.isProductQuery = true;
            fileAnalysis.relevantFile = queryContext.category;
        }

        if (fileAnalysis.isProductQuery && fileAnalysis.relevantFile !== "none") {
            // If switching categories, reset shown products
            if (fileAnalysis.shouldSwitchCategory) {
                queryContext.shownProductIds = [];
            }
            
            queryContext.category = fileAnalysis.relevantFile;
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

    const userName = JSON.parse(localStorage.getItem('user'))?.name || '';
    const confirmationMessage = `${userName ? userName + ', ' : ''}We have some great ${relevantFile.replace('.json', '').replace('./', '')} matching your request! Would you like me to show them?`;
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
        You are an e-commerce assistant helping a customer find products.
        
        Here is the conversation history for context:
        ${chatContext}
        
        Here are products from our "${relevantFile.replace('.json', '').replace('./', '')}" collection:
        ${JSON.stringify(products, null, 2)}
        
        The user asked: "${userMessage}"
        Previously shown product IDs: ${JSON.stringify(queryContext.shownProductIds || [])}
        
        Please:
        1. Select up to 5 relevant products that match the user's request
        2. Filter products with a price greater than ${priceThreshold} if specified
        3. Consider price, features, user's implied needs
        4. For follow-up requests, select new products not previously shown
        5. If no products match, provide a fallback message
        6. The user's name is ${JSON.parse(localStorage.user).name} - use it in your response
        
        Return your response in this exact JSON format:
        {
            "responseText": "Your friendly response to the user",
            "products": [
                {
                    "id": "product ID",
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
            addMessageToChat('I couldn\'t find more products matching your request. Would you like to see items from another category?', 'bot-message');
            saveChatHistory({
                type: 'message',
                sender: 'bot',
                message: 'I couldn\'t find more products matching your request. Would you like to see items from another category?',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const uniqueProducts = responseData.products.filter(product =>
            !queryContext.shownProductIds.includes(product.id || product.title)
        );

        if (uniqueProducts.length === 0) {
            addMessageToChat('I\'ve shown you all the available products in this category. Would you like to see something else?', 'bot-message');
            saveChatHistory({
                type: 'message',
                sender: 'bot',
                message: 'I\'ve shown you all the available products in this category. Would you like to see something else?',
                timestamp: new Date().toISOString()
            });
            return;
        }

        renderProductCards(uniqueProducts);

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
        addMessageToChat('I found some products that might interest you, but had trouble displaying them properly. Try asking for a different category.', 'bot-message');
        saveChatHistory({
            type: 'message',
            sender: 'bot',
            message: 'I found some products that might interest you, but had trouble displaying them properly. Try asking for a different category.',
            timestamp: new Date().toISOString()
        });
    }
}

async function handleGeneralQuery(userMessage) {
    const chatContext = getChatContext();
    const generalPrompt = `
        You are a helpful assistant for an e-commerce website.
        The user's name is ${JSON.parse(localStorage.user).name} - use it in your response.
        
        Conversation history:
        ${chatContext}
        
        User message: "${userMessage}"
        
        Provide a helpful response (2-3 sentences max).
        If related to products we sell, suggest specific categories.
        Be friendly and engaging.
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
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
    return newMessage;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium flex items-center ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } animate-fade-in`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2"></i>
        ${message}
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('animate-fade-in');
        toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function showProductPopup(product) {
    const insightPrompt = `
        Generate a short, exciting comment about this product:
        ${product.title}
        Keep it positive and engaging (max 1 sentence).
    `;

    let insight = "Great choice! This product looks amazing!";
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

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../login.html';
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async function () {
    // Preload product files
    await Promise.all(productFiles.map(async file => {
        try {
            const response = await fetch(file);
            if (!response.ok) throw new Error(`Failed to fetch ${file}`);
            allProductsCache[file] = await response.json();
        } catch (error) {
            console.error(`Error preloading ${file}:`, error);
        }
    }));
    
    // Load initial cart data
    await getCartItems();
    updateCartItemCount();
    
    // Set up popup close handler
    document.getElementById('popupOverlay').addEventListener('click', closePopup);
    
    // Check authentication
    let token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "../login.html";
    }
});