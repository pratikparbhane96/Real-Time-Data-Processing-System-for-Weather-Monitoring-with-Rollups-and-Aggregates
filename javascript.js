const searchForm = document.querySelector("#search");  
const celciusBtn = document.querySelector(".celcius");
const fahrenheitBtn = document.querySelector(".fahrenheit");

const apiKey = 'a590330ffd4a60b9d4583f2bc7f59023'; // Replace with your OpenWeatherMap API key 
let alertCount = 0; // To track consecutive alerts
const temperatureThreshold = 35; // User-configurable temperature threshold
let dailySummary = {
    maxTemperature: -Infinity,
    minTemperature: Infinity,
    currentTemperature: 0,
    weatherFetchCount: 0 // Count of weather fetches in the current day
};

let intervalId; // Store the interval ID for clearing later
let isCelsius = true; // Track whether the temperature is in Celsius or Fahrenheit

// Store daily summary in localStorage
function storeDailySummary() {
    const date = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    dailySummary.date = date;
    let summaries = JSON.parse(localStorage.getItem('dailySummaries')) || [];
    summaries.push(dailySummary);
    localStorage.setItem('dailySummaries', JSON.stringify(summaries));
}

// Check for alerts
function checkAlerts(currentTemp) {
    if (currentTemp > temperatureThreshold) {
        alertCount++;
    } else {
        alertCount = 0; // Reset alert count if the temperature is below the threshold
    }

    if (alertCount >= 2) {
        alert("Alert! Temperature exceeded " + temperatureThreshold + "°C for " + alertCount + " consecutive updates.");
    }
}

// Function to convert Kelvin to Celsius
function kelvinToCelsius(kelvin) {
    return kelvin - 273.15;
}

// Function to convert Kelvin to Fahrenheit
function kelvinToFahrenheit(kelvin) {
    return (kelvin - 273.15) * 9 / 5 + 32;
}

async function fetchWeather(city) {
    // Get latitude and longitude
    const geoResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`);
    const geoData = await geoResponse.json();

    if (geoData.cod !== 200) {
        document.getElementById('weatherOutput').innerHTML = "City not found in our database";
        clearInterval(intervalId); // Stop fetching if the city is not found
        return;
    }

    const lat = geoData.coord.lat;
    const lon = geoData.coord.lon;

    // Fetch weather data
    const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`);
    const weatherData = await weatherResponse.json();

    // Convert temperature to Celsius
    const currentTempC = kelvinToCelsius(weatherData.main.temp);
    const feelsLikeC = kelvinToCelsius(weatherData.main.feels_like);

    // Update daily summary data
    updateDailySummary(currentTempC);
    
    // Display weather data
    displayWeather(weatherData, currentTempC, feelsLikeC);

    // Fetch past week weather data
    fetchPastWeekWeather(lat, lon);

    // Check for alerts
    checkAlerts(currentTempC);
}

function updateDailySummary(currentTemp) {
    dailySummary.weatherFetchCount++;
    dailySummary.currentTemperature = currentTemp;

    // Update max and min temperatures
    dailySummary.maxTemperature = Math.max(dailySummary.maxTemperature, currentTemp)+2.3;
    dailySummary.minTemperature = Math.min(dailySummary.minTemperature, currentTemp)-1.7;
}

function displayWeather(weatherData, currentTempC, feelsLikeC) {
    const avgTemperature = (dailySummary.maxTemperature + dailySummary.minTemperature) / 2; // Recalculate average
    const currentTemperature = isCelsius ? currentTempC : kelvinToFahrenheit(weatherData.main.temp);
    const feelsLikeTemperature = isCelsius ? feelsLikeC : kelvinToFahrenheit(weatherData.main.feels_like);
    
    // Fetch the weather icon from OpenWeatherMap API
    const weatherIconCode = weatherData.weather[0].icon;
    const weatherIconUrl = `http://openweathermap.org/img/wn/${weatherIconCode}@2x.png`;

    const outputDiv = document.getElementById('weatherOutput');
    outputDiv.innerHTML = `
        <div class="tile"><img src="${weatherIconUrl}" alt="Weather Icon"> Average Temperature: ${(avgTemperature).toFixed(2)}°</div>
        <div class="tile"><img src="${weatherIconUrl}" alt="Weather Icon"> Maximum Temperature: ${dailySummary.maxTemperature.toFixed(2)}°</div>
        <div class="tile"><img src="${weatherIconUrl}" alt="Weather Icon"> Minimum Temperature: ${dailySummary.minTemperature.toFixed(2)}°</div>
        <div class="tile"><img src="${weatherIconUrl}" alt="Weather Icon"> Current Temperature: ${currentTemperature.toFixed(2)}°${isCelsius ? 'C' : 'F'}</div>
        <div class="tile"><img src="${weatherIconUrl}" alt="Weather Icon"> Today's Weather Feels Like: ${feelsLikeTemperature.toFixed(2)}°${isCelsius ? 'C' : 'F'}</div>
        <div class="tile"><img src="${weatherIconUrl}" alt="Weather Icon"> Main Weather Condition: ${weatherData.weather[0].description}</div>
        <div class="tile">Last Updated: ${new Date(weatherData.dt * 1000).toLocaleString()}</div>
        <div class="tile">🌅 Sunrise: ${new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString()}</div>
        <div class="tile">🌇 Sunset: ${new Date(weatherData.sys.sunset * 1000).toLocaleTimeString()}</div>
        <div class="tile">🌬️ Wind Status: ${weatherData.wind.speed} m/s</div>
        <div class="tile">💧 Humidity: ${weatherData.main.humidity}%</div>
        <div class="tile">Visibility: ${(weatherData.visibility / 1000).toFixed(1)} km</div>
    `;
}

// Event listeners for temperature conversion buttons
celciusBtn.addEventListener("click", () => {
    isCelsius = true; // Set to Celsius
    const city = document.getElementById('cityInput').value;
    fetchWeather(city); // Fetch weather data again to update the display
});

fahrenheitBtn.addEventListener("click", () => {
    isCelsius = false; // Set to Fahrenheit
    const city = document.getElementById('cityInput').value;
    fetchWeather(city); // Fetch weather data again to update the display
});

// Function to prompt for city input or use current location
async function promptForCity() {
    const useCurrentLocation = confirm("Do you want to use your current location?");
    if (useCurrentLocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            // Use the latitude and longitude to fetch weather data
            await fetchWeatherByCoords(lat, lon);
        }, (error) => {
            console.error("Geolocation error: ", error);
            const city = prompt("Could not get your location. Please enter a city name:");
            fetchWeather(city); // Fetch weather for the entered city
        });
    } else {
        const city = prompt("Please enter the city name:");
        fetchWeather(city); // Fetch weather for the entered city
    }
}

// Function to fetch weather by coordinates
async function fetchWeatherByCoords(lat, lon) {
    const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`);
    const weatherData = await weatherResponse.json();
    
    // Convert temperature to Celsius
    const currentTempC = kelvinToCelsius(weatherData.main.temp);
    const feelsLikeC = kelvinToCelsius(weatherData.main.feels_like);

    // Update daily summary data
    updateDailySummary(currentTempC);
    
    // Display weather data
    displayWeather(weatherData, currentTempC, feelsLikeC);

    // Fetch past week weather data
    fetchPastWeekWeather(lat, lon);

    // Check for alerts
    checkAlerts(currentTempC);
}

function startFetchingWeather() {
    promptForCity(); // Prompt for city input or use current location
    clearInterval(intervalId); // Clear any existing intervals
    intervalId = setInterval(promptForCity, 60000); // Repeat every minute
}

// Event listener for the search form
searchForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent page reload
    startFetchingWeather(); // Start fetching weather on form submission
});
