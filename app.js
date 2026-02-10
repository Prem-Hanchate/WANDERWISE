// Get your free key at: https://console.groq.com/keys
// Replace 'YOUR_API_KEY_HERE' with your actual Groq API key
const GROQ_API_KEY = "YOUR_API_KEY_HERE"; 

// Global variables for tracking
let currentPlan = null;
let budgetChart = null;
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];

// Theme Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    // Load saved theme preference, default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        body.classList.remove('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
    
    // Toggle theme
    themeToggle.addEventListener('click', function() {
        body.classList.toggle('dark-theme');
        const isDark = body.classList.contains('dark-theme');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // Load expenses on startup
    updateExpenseTracker();
});

// Toggle Action Menu
function toggleActionMenu() {
    const dropdown = document.getElementById('actionMenuDropdown');
    dropdown.classList.toggle('hidden');
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    const actionMenu = document.getElementById('actionMenuToggle');
    const dropdown = document.getElementById('actionMenuDropdown');
    
    if (actionMenu && dropdown && !actionMenu.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});

async function generatePlan() {
    const dest = document.getElementById('dest').value;
    const budget = document.getElementById('budget').value;
    const currency = document.getElementById('currency').value;
    const days = document.getElementById('days').value; // New Update
    
    const btn = document.getElementById('btn');
    const output = document.getElementById('output');
    const resultsDiv = document.getElementById('results');

    if(!dest || !budget || !days) return alert("All fields including Days are compulsory!");

    // Check if API key is configured
    if(!GROQ_API_KEY || GROQ_API_KEY === "YOUR_API_KEY_HERE") {
        alert("⚠️ API Key Not Configured!\n\n" +
              "Please follow these steps:\n\n" +
              "1. Visit: https://console.groq.com/keys\n" +
              "2. Sign up for a FREE account\n" +
              "3. Generate a new API key\n" +
              "4. Open app.js file\n" +
              "5. Replace 'YOUR_API_KEY_HERE' with your actual key\n" +
              "6. Save the file and refresh the page");
        return;
    }

    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> CALCULATING ITINERARY...';
    btn.disabled = true;

    const PROMPT = `
        Act as a Professional Travel Budget Expert.
        Destination: ${dest}. 
        Total Budget: ${budget} ${currency}.
        Duration: ${days} Days.
        
        Requirement:
        1. Create a detailed ${days}-day itinerary.
        2. Provide a daily spending limit in ${currency}.
        3. List 3 specific budget-saving hacks for ${dest}.
        4. Recommend local transport options.
        
        Use clean HTML tags: <h4>, <ul>, <li>, and <strong>.
    `;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: PROMPT }],
                temperature: 0.6 
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message || "Invalid API key. Please check your Groq API key in app.js");
        }

        resultsDiv.classList.remove('hidden');
        output.innerHTML = data.choices[0].message.content;
        resultsDiv.scrollIntoView({ behavior: 'smooth' });

        // Store current plan
        currentPlan = {
            destination: dest,
            budget: budget,
            currency: currency,
            days: days,
            content: data.choices[0].message.content,
            date: new Date().toISOString()
        };

        // Create budget breakdown chart
        createBudgetChart(budget, currency);

        // Fetch weather
        getWeatherForDestination(dest);

    } catch (error) {
        alert("❌ Error: " + error.message + "\n\nIf you're seeing an authentication error, please verify your Groq API key in app.js is correct.");
    } finally {
        btn.innerHTML = '<i class="fas fa-sparkles mr-2"></i> OPTIMIZE MY TRAVEL PLAN';
        btn.disabled = false;
    }
}

// Download Report as Word Document
function downloadReport() {
    const output = document.getElementById('output');
    const dest = document.getElementById('dest').value || 'TravelPlan';
    
    if (!output.innerHTML.trim()) {
        alert('Please generate a travel plan first!');
        return;
    }

    // Create formatted HTML for Word document
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${dest} Travel Plan</title>
            <style>
                body {
                    font-family: 'Calibri', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    padding: 40px;
                }
                h4 {
                    color: #2563eb;
                    border-bottom: 2px solid #2563eb;
                    padding-bottom: 8px;
                    margin-top: 20px;
                }
                ul {
                    margin-left: 20px;
                }
                li {
                    margin-bottom: 8px;
                }
                strong {
                    color: #1e40af;
                }
            </style>
        </head>
        <body>
            <h1 style="color: #1e40af; text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 15px;">
                ${dest} - Travel Plan
            </h1>
            <p style="text-align: center; color: #666; margin-bottom: 30px;">
                Generated on ${new Date().toLocaleDateString()}
            </p>
            ${output.innerHTML}
        </body>
        </html>
    `;

    // Convert HTML to Word document blob
    const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/msword'
    });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dest}_Travel_Plan.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showDownloadNotification('Report downloaded successfully!');
}

// Show download notification
function showDownloadNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        font-weight: 600;
        animation: slideInRight 0.5s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease-out';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ============ NEW FEATURES ============

// 1. Copy to Clipboard
function copyToClipboard() {
    const output = document.getElementById('output');
    if (!output.innerHTML.trim()) {
        alert('No plan to copy!');
        return;
    }
    
    const text = output.innerText;
    navigator.clipboard.writeText(text).then(() => {
        showDownloadNotification('✓ Copied to clipboard!');
    }).catch(err => {
        alert('Failed to copy: ' + err);
    });
}

// 2. Email Report
function emailReport() {
    const output = document.getElementById('output');
    if (!output.innerHTML.trim()) {
        alert('Please generate a travel plan first!');
        return;
    }
    
    const dest = document.getElementById('dest').value || 'Travel';
    const subject = encodeURIComponent(`${dest} - Travel Plan`);
    const body = encodeURIComponent(output.innerText);
    
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// 3. Print Report
function printReport() {
    const output = document.getElementById('output');
    if (!output.innerHTML.trim()) {
        alert('Please generate a travel plan first!');
        return;
    }
    
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(`
        <html>
        <head>
            <title>Travel Plan - ${document.getElementById('dest').value}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 40px;
                    line-height: 1.6;
                }
                h4 {
                    color: #2563eb;
                    border-bottom: 2px solid #2563eb;
                    padding-bottom: 8px;
                }
                ul { margin-left: 20px; }
                li { margin-bottom: 8px; }
            </style>
        </head>
        <body>
            <h1>${document.getElementById('dest').value} - Travel Plan</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            ${output.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// 4. Share to Social Media
function shareToSocial() {
    document.getElementById('shareModal').classList.remove('hidden');
}

function shareOn(platform) {
    const dest = document.getElementById('dest').value || 'Travel';
    const text = encodeURIComponent(`Check out my ${dest} travel plan created with WanderWise!`);
    const url = encodeURIComponent(window.location.href);
    
    let shareUrl;
    switch(platform) {
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${text}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
            break;
        case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
            break;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
    closeModal('shareModal');
}

// 5. Save Plan
function savePlan() {
    if (!currentPlan) {
        alert('No plan to save!');
        return;
    }
    
    const plans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    const planName = prompt('Enter a name for this plan:', currentPlan.destination);
    
    if (planName) {
        currentPlan.name = planName;
        plans.push(currentPlan);
        localStorage.setItem('savedPlans', JSON.stringify(plans));
        showDownloadNotification('✓ Plan saved successfully!');
    }
}

// 6. Open Saved Plans
function openSavedPlans() {
    const plans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    const listDiv = document.getElementById('savedPlansList');
    
    if (plans.length === 0) {
        listDiv.innerHTML = '<p class="empty-state">No saved plans yet. Generate and save your first plan!</p>';
    } else {
        listDiv.innerHTML = plans.map((plan, index) => `
            <div class="saved-plan-card">
                <div class="plan-info">
                    <h4><i class="fas fa-map-marker-alt"></i> ${plan.name || plan.destination}</h4>
                    <p><i class="fas fa-calendar"></i> ${plan.days} days | <i class="fas fa-money-bill"></i> ${plan.budget} ${plan.currency}</p>
                    <small>${new Date(plan.date).toLocaleDateString()}</small>
                </div>
                <div class="plan-actions">
                    <button onclick="loadPlan(${index})" class="load-plan-btn"><i class="fas fa-eye"></i></button>
                    <button onclick="deletePlan(${index})" class="delete-plan-btn"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }
    
    document.getElementById('savedPlansModal').classList.remove('hidden');
}

function loadPlan(index) {
    const plans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    const plan = plans[index];
    
    document.getElementById('dest').value = plan.destination;
    document.getElementById('budget').value = plan.budget;
    document.getElementById('currency').value = plan.currency;
    document.getElementById('days').value = plan.days;
    document.getElementById('output').innerHTML = plan.content;
    document.getElementById('results').classList.remove('hidden');
    
    currentPlan = plan;
    closeModal('savedPlansModal');
    showDownloadNotification('✓ Plan loaded!');
}

function deletePlan(index) {
    if (confirm('Delete this plan?')) {
        const plans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
        plans.splice(index, 1);
        localStorage.setItem('savedPlans', JSON.stringify(plans));
        openSavedPlans();
    }
}

// 7. Currency Converter
function openCurrencyConverter() {
    document.getElementById('currencyModal').classList.remove('hidden');
}

async function convertCurrency() {
    const amount = document.getElementById('convertAmount').value;
    const from = document.getElementById('fromCurrency').value;
    const to = document.getElementById('toCurrency').value;
    
    if (!amount) {
        alert('Please enter an amount');
        return;
    }
    
    try {
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
        const data = await response.json();
        const rate = data.rates[to];
        const result = (amount * rate).toFixed(2);
        
        document.getElementById('conversionResult').innerHTML = `
            <div class="conversion-display">
                <div class="conversion-amount from-amount">
                    <span class="amount">${parseFloat(amount).toLocaleString()}</span>
                    <span class="currency">${from}</span>
                </div>
                <i class="fas fa-arrow-right conversion-arrow"></i>
                <div class="conversion-amount to-amount">
                    <span class="amount">${parseFloat(result).toLocaleString()}</span>
                    <span class="currency">${to}</span>
                </div>
            </div>
            <p class="rate-info">Exchange Rate: 1 ${from} = ${rate.toFixed(4)} ${to}</p>
        `;
    } catch (error) {
        alert('Failed to fetch exchange rates. Please try again.');
    }
}

// 8. Weather Widget
function openWeatherWidget() {
    document.getElementById('weatherModal').classList.remove('hidden');
}

async function getWeather() {
    const city = document.getElementById('weatherCity').value;
    if (!city) {
        alert('Please enter a city name');
        return;
    }
    
    await getWeatherForDestination(city);
}

async function getWeatherForDestination(city) {
    const resultDiv = document.getElementById('weatherResult');
    const widgetDiv = document.getElementById('weatherWidget');
    const contentDiv = document.getElementById('weatherContent');
    
    try {
        // Using Open-Meteo API (free, no key required)
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found');
        }
        
        const { latitude, longitude, name, country } = geoData.results[0];
        
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`);
        const weatherData = await weatherResponse.json();
        
        const weatherIcons = {
            0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
            45: '🌫️', 48: '🌫️',
            51: '🌦️', 53: '🌧️', 55: '🌧️',
            61: '🌧️', 63: '🌧️', 65: '🌧️',
            71: '🌨️', 73: '🌨️', 75: '🌨️',
            80: '🌦️', 81: '🌧️', 82: '⛈️',
            95: '⛈️', 96: '⛈️', 99: '⛈️'
        };
        
        const icon = weatherIcons[weatherData.current.weathercode] || '🌡️';
        const temp = Math.round(weatherData.current.temperature_2m);
        
        const weatherHTML = `
            <div class="weather-display">
                <div class="weather-main">
                    <div class="weather-icon">${icon}</div>
                    <div class="weather-temp">${temp}°C</div>
                    <div class="weather-location">${name}, ${country}</div>
                </div>
                <div class="weather-details">
                    <div class="detail-item">
                        <i class="fas fa-wind"></i>
                        <span>${weatherData.current.windspeed_10m} km/h</span>
                    </div>
                </div>
                <div class="forecast-days">
                    ${weatherData.daily.time.slice(0, 5).map((date, i) => `
                        <div class="forecast-day">
                            <div>${new Date(date).toLocaleDateString('en', {weekday: 'short'})}</div>
                            <div class="forecast-temp">
                                ${Math.round(weatherData.daily.temperature_2m_max[i])}° / ${Math.round(weatherData.daily.temperature_2m_min[i])}°
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        if (resultDiv) resultDiv.innerHTML = weatherHTML;
        if (contentDiv) {
            contentDiv.innerHTML = weatherHTML;
            widgetDiv.classList.remove('hidden');
        }
        
    } catch (error) {
        const errorHTML = `<p class="error-message">Could not fetch weather data. Please try again.</p>`;
        if (resultDiv) resultDiv.innerHTML = errorHTML;
    }
}

// 9. Flight Estimator
function openFlightEstimator() {
    document.getElementById('flightModal').classList.remove('hidden');
}

async function estimateFlight() {
    const from = document.getElementById('fromCity').value;
    const to = document.getElementById('toCity').value;
    const date = document.getElementById('flightDate').value;
    
    if (!from || !to || !date) {
        alert('Please fill all fields');
        return;
    }
    
    // Simulated flight price estimation
    const basePrice = Math.floor(Math.random() * 30000) + 10000;
    const daysUntil = Math.floor((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    
    let priceMultiplier = 1;
    if (daysUntil < 7) priceMultiplier = 1.5;
    else if (daysUntil < 14) priceMultiplier = 1.3;
    else if (daysUntil < 30) priceMultiplier = 1.1;
    else if (daysUntil > 90) priceMultiplier = 0.8;
    
    const estimatedPrice = Math.floor(basePrice * priceMultiplier);
    
    document.getElementById('flightResult').innerHTML = `
        <div class="flight-estimate">
            <div class="flight-route">
                <div class="airport">${from.toUpperCase()}</div>
                <i class="fas fa-plane flight-icon"></i>
                <div class="airport">${to.toUpperCase()}</div>
            </div>
            <div class="flight-price">
                <div class="price-label">Estimated Price</div>
                <div class="price-amount">₹${estimatedPrice.toLocaleString()}</div>
            </div>
            <div class="flight-tips">
                <h4>💡 Booking Tips:</h4>
                <ul>
                    ${daysUntil < 14 ? '<li>⚠️ Booking soon! Prices may be higher</li>' : ''}
                    ${daysUntil > 60 ? '<li>✓ Great timing! Book now for best prices</li>' : ''}
                    <li>Compare prices on multiple platforms</li>
                    <li>Consider nearby airports</li>
                    <li>Book midweek for better deals</li>
                </ul>
            </div>
        </div>
    `;
}

// 10. Compare Destinations
function openCompareDestinations() {
    document.getElementById('compareModal').classList.remove('hidden');
}

async function compareDestinations() {
    const dest1 = document.getElementById('dest1').value;
    const dest2 = document.getElementById('dest2').value;
    const budget = document.getElementById('compareBudget').value;
    const days = document.getElementById('compareDays').value;
    
    if (!dest1 || !dest2 || !budget || !days) {
        alert('Please fill all fields');
        return;
    }
    
    document.getElementById('compareResult').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Comparing destinations...</div>';
    
    try {
        const prompt1 = `Briefly compare ${dest1} vs ${dest2} for a ${days}-day trip with ${budget} INR budget. 
        Give: 1) Cost comparison 2) Best for budget 3) Key advantages of each. Keep it concise, 5-6 lines max. Use HTML: <strong>, <ul>, <li>`;
        
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt1 }],
                temperature: 0.7
            })
        });
        
        const data = await response.json();
        
        document.getElementById('compareResult').innerHTML = `
            <div class="comparison-grid">
                <div class="compare-card">
                    <h4>🗺️ ${dest1}</h4>
                </div>
                <div class="compare-vs">VS</div>
                <div class="compare-card">
                    <h4>🗺️ ${dest2}</h4>
                </div>
            </div>
            <div class="compare-analysis">
                ${data.choices[0].message.content}
            </div>
        `;
    } catch (error) {
        document.getElementById('compareResult').innerHTML = '<p class="error-message">Failed to compare. Please try again.</p>';
    }
}

// 11. Travel Checklist
function openChecklist() {
    document.getElementById('checklistModal').classList.remove('hidden');
    loadChecklistState();
}

function loadChecklistState() {
    const checkboxes = document.querySelectorAll('#checklistModal input[type="checkbox"]');
    const savedState = JSON.parse(localStorage.getItem('checklist') || '{}');
    
    checkboxes.forEach((checkbox, index) => {
        checkbox.checked = savedState[index] || false;
        checkbox.onchange = saveChecklistState;
    });
}

function saveChecklistState() {
    const checkboxes = document.querySelectorAll('#checklistModal input[type="checkbox"]');
    const state = {};
    checkboxes.forEach((checkbox, index) => {
        state[index] = checkbox.checked;
    });
    localStorage.setItem('checklist', JSON.stringify(state));
}

// 12. Expense Tracker
function openExpenseTracker() {
    document.getElementById('expenseModal').classList.remove('hidden');
    updateExpenseTracker();
}

function addExpense() {
    const desc = document.getElementById('expenseDesc').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    
    if (!desc || !amount) {
        alert('Please fill all fields');
        return;
    }
    
    expenses.push({
        desc,
        amount,
        category,
        date: new Date().toISOString()
    });
    
    localStorage.setItem('expenses', JSON.stringify(expenses));
    
    document.getElementById('expenseDesc').value = '';
    document.getElementById('expenseAmount').value = '';
    
    updateExpenseTracker();
    showDownloadNotification('✓ Expense added!');
}

function updateExpenseTracker() {
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const budget = parseFloat(document.getElementById('budget').value) || 0;
    const remaining = budget - total;
    
    const categoryTotals = {};
    expenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    
    document.getElementById('expenseStats').innerHTML = `
        <div class="expense-summary">
            <div class="stat-card">
                <div class="stat-label">Total Budget</div>
                <div class="stat-value">₹${budget.toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Spent</div>
                <div class="stat-value spent">₹${total.toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Remaining</div>
                <div class="stat-value ${remaining < 0 ? 'negative' : ''}">₹${remaining.toLocaleString()}</div>
            </div>
        </div>
    `;
    
    document.getElementById('expenseList').innerHTML = expenses.length === 0 
        ? '<p class="empty-state">No expenses yet. Start tracking!</p>'
        : expenses.slice().reverse().map((exp, index) => `
            <div class="expense-item">
                <div class="expense-info">
                    <span class="expense-category">${document.querySelector(`#expenseCategory option[value="${exp.category}"]`).textContent}</span>
                    <span class="expense-desc">${exp.desc}</span>
                    <span class="expense-date">${new Date(exp.date).toLocaleDateString()}</span>
                </div>
                <div class="expense-amount">₹${exp.amount.toLocaleString()}</div>
            </div>
        `).join('');
}

function clearExpenses() {
    if (confirm('Clear all expenses?')) {
        expenses = [];
        localStorage.setItem('expenses', JSON.stringify(expenses));
        updateExpenseTracker();
    }
}

// 13. Budget Chart
function createBudgetChart(budget, currency) {
    const ctx = document.getElementById('budgetChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (budgetChart) {
        budgetChart.destroy();
    }
    
    // Sample budget breakdown
    const accommodation = budget * 0.35;
    const food = budget * 0.25;
    const transport = budget * 0.20;
    const activities = budget * 0.15;
    const misc = budget * 0.05;
    
    budgetChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['🏨 Accommodation', '🍽️ Food', '🚗 Transport', '🎭 Activities', '📦 Misc'],
            datasets: [{
                data: [accommodation, food, transport, activities, misc],
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#8b5cf6',
                    '#ef4444'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: document.body.classList.contains('dark-theme') ? '#e2e8f0' : '#334155',
                        font: { size: 12 },
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + currency + ' ' + context.parsed.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

// Modal Management
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Close modal on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.add('hidden');
    }
}