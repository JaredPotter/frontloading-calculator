const intrinioSDK = require('intrinio-sdk');
require('dotenv').config('./');

const apiKey = process.env.INTRINIO_API_KEY;
console.log(apiKey);

intrinioSDK.ApiClient.instance.authentications['ApiKeyAuth'].apiKey = apiKey;

const securityAPI = new intrinioSDK.SecurityApi();

// const identifier = "VFINX";
const identifier = "VOO";

const opts = { 
    'startDate': new Date("2019-01-01"), // Date | Return prices on or after the date
    'endDate': new Date("2019-01-01"), // Date | Return prices on or before the date
    'frequency': "daily", // String | Return stock prices in the given frequency
    'pageSize': 100, // Number | The number of results to return
    'nextPage': null // String | Gets the next page of data from a previous API call
};
  
securityAPI.getSecurityStockPrices(identifier, opts)
    .then(function(data) {
        debugger;
        console.log(data);

        }, function(error) {
        console.error(error);
    })
    .catch(function() {

    });