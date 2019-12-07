import React from 'react';
import './Home.css';

const moment = require('moment');
const VFINX = require('../VFINX.json');
const VFINX_DIVIDENDS = require('../VFINX_DIVIDENDS.json');

class Home extends React.Component {
    constructor(props) {
        super(props);

        const VFINX_JSON = VFINX;
        const VFINX_DIVIDENDS_JSON = VFINX_DIVIDENDS;
        const securityName = 'Vanguard 500 Index Fund Investor Shares';

        this.state = {
            events: [],
            max401k: {
                2016: 18000,
                2017: 18000,
                2018: 18500,
                2019: 19000,                
            },
            isFrontLoad: true,
            salary: 100000,
            employerMatch: 0.04,
            payFrequency: 26,
            frontLoadContributionPercent: 92,
            firstPayCheckDate: '2016-01-08', // year month day
            startDate: '2016-01-01',
            endDate: '2019-11-27',
            // firstPayCheckDate: '2019-01-11', // year month day
            // startDate: '2019-01-01',
            // endDate: '2019-11-27',
            securities: VFINX_JSON.data,
            dividends: VFINX_DIVIDENDS_JSON.data.CashDividends,
            shares: 0,
            currentShareValue: 290,
            securityName: securityName,
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleDateChange = this.handleDateChange.bind(this);
        this.calculate = this.calculate.bind(this);
        this.sortEventsByDate = this.sortEventsByDate.bind(this);
        this.renderEventList = this.renderEventList.bind(this);
    }

    handleChange(e, field) {
        const value = e.target.value;

        const statePatch = {};
        statePatch[field] = value;

        this.setState(statePatch);
    }

    handleCheckboxChange(e, field) {
        const value = e.target.checked;

        const statePatch = {};
        statePatch[field] = value;

        this.setState(statePatch);
    }

    handleDateChange(e, field) {
        const value = e.target.value;

        const statePatch = {};
        statePatch[field] = value;

        this.setState(statePatch);
    }

    calculate() {
        // fetch(
        //     'https://api.vanguard.com/rs/ire/01/ind/fund/0040/price.jsonp?callback=angular.callbacks._e&planId=null',
        //     {
        //         credentials: 'include',
        //         headers: {
        //             accept: '*/*',
        //             'accept-language': 'en-US,en;q=0.9',
        //             'cache-control': 'no-cache',
        //             pragma: 'no-cache',
        //             'sec-fetch-mode': 'no-cors',
        //             'sec-fetch-site': 'same-site'
        //         },
        //         referrer:
        //             'https://investor.vanguard.com/mutual-funds/profile/VFINX',
        //         referrerPolicy: 'no-referrer-when-downgrade',
        //         body: null,
        //         method: 'GET',
        //         mode: 'cors'
        //     }
        // )
        //     .then(response => {
        //         debugger;
        //     })
        //     .catch(error => {
        //         debugger;
        //     });


        // Narrow arrays
        // const filteredSecurityPrices = this.state.securities.filter((item) => {
        //     const itemDate = moment(item.date);
        //     const startDate = moment(this.state.startDate);
        //     const endDate = moment(this.state.endDate);

        //     if(itemDate.isSameOrAfter(startDate) && itemDate.isSameOrBefore(endDate)) {
        //         return true;
        //     }
        // });
        // const filteredSortedSecurityPrices = filteredSecurityPrices.sort(this.sortDates);

        // const securityDateToPriceMap = filteredSortedSecurityPrices.map((security) => {
        //     return {

        //     };
        // });
        const securityDateToPriceMap = this.state.securities.reduce(
            (map, security) => {
                map[security.date] = security.value;

                return map;
            },
            {}
        );

        const events = [];

        const payCheckDates = this.generatePayDates(
            this.state.firstPayCheckDate,
            this.state.endDate,
            this.state.payFrequency
        );

        const matchAmountYearly = this.state.salary * this.state.employerMatch;
        

        // todo: Request basic ADP w/ state + pay frequency => fica/medicare amounts to subtract.
        const jaredGrossAfterFicaMedicare = 4209.02; // todo: remove this.
        const grossPayCheck = this.state.salary / this.state.payFrequency;
        const frontLoadContributionAmount =
            grossPayCheck * (this.state.frontLoadContributionPercent / 100);
        const frontLoadCheckContributionAmount =
            grossPayCheck * this.state.employerMatch;

        // Generate Buys. While frontLoadAmount
        let yearToDate401k = 0;
        let checkCount = 0;
        let isTransition = false;
        let lastYear;

        // Generate buy events.
        for (let i = 0; i < payCheckDates.length; i++) {
            let date = payCheckDates[i];
            const currentYear = moment(date);

            // const 
            const max401kLimit = this.state.max401k[currentYear.format('YYYY')];
            const frontLoadAmount = max401kLimit - matchAmountYearly;

            if(!lastYear || currentYear.isAfter(lastYear, 'year')) {
                lastYear = moment(currentYear);
                yearToDate401k = 0;
            };

            if(this.state.isFrontLoad) {
                while (yearToDate401k + frontLoadContributionAmount < frontLoadAmount
                    ) {
                        yearToDate401k += frontLoadContributionAmount;
                        checkCount++;
        
                        const buyEvent = {
                            type: 'buy',
                            date: date,
                            amount: frontLoadContributionAmount
                        };
        
                        events.push(buyEvent);
        
                        isTransition = true;
                        i++;
                        date = payCheckDates[i];
                }
                
                //todo: see if we can move the 'transition check' to here
                
            }
            else { // even
                const equalAmount = max401kLimit / this.state.payFrequency;
                const buyEvent = {
                    type: 'buy',
                    date: date,
                    amount: equalAmount
                };
                events.push(buyEvent);   
                continue;             
            }

            if (isTransition) {
                // Transition Date
                date = payCheckDates[i];
                const adjustedMatchAmountYearly =
                    1 - checkCount / this.state.payFrequency;
                const yup = matchAmountYearly * adjustedMatchAmountYearly;
                const transitionContributionAmount =
                    max401kLimit - (yearToDate401k + yup);
                const buyEvent = {
                    type: 'buy',
                    date: date,
                    amount: transitionContributionAmount
                };
                events.push(buyEvent);
                isTransition = false;
                continue;
            }

            const buyEvent = {
                type: 'buy',
                date: date,
                amount: frontLoadCheckContributionAmount
            };
            events.push(buyEvent);
        }

        // for dev - check
        // const sum = events.reduce((acc, event) => {
        //     return acc + event.amount;
        // }, 0);

        // Generate dividend events.
        for (let dividend of this.state.dividends) {
            const rawDate = dividend.ExDate;
            const momentDate = moment(rawDate);
            const momentStartDate = moment(this.state.startDate);
            const momentEndDate = moment(this.state.endDate);
            const dividendAmount = dividend.DividendAmount;

            if (
                momentDate.isSameOrAfter(momentStartDate) &&
                momentDate.isSameOrBefore(momentEndDate)
            ) {
                const dividendEvent = {
                    type: 'dividend',
                    date: rawDate,
                    amount: dividendAmount
                };

                events.push(dividendEvent);
            }
        }

        // Sort Events.
        const sortedEvents = events.sort(this.sortEventsByDate);

        let shares = 0;
        const currentSharePrice = 290.65; // todo: fetch this data.

        for(const event of events) {
            let date = event.date;
            const momentDate = moment(date);
            let price = securityDateToPriceMap[date];

            while(!price) {
                momentDate.add(1, 'days');
                date = momentDate.format('YYYY-MM-DD');

                price = securityDateToPriceMap[date];
            }

            switch(event.type) {
                case 'buy':
                    const contributionAmount = event.amount + frontLoadCheckContributionAmount;
                    // debugger;
                    shares += contributionAmount / price;
                    break;
                case 'dividend':
                    const dividendPayout = shares * event.amount;
                    const newShares = dividendPayout / price;
                    // debugger;
                    shares += newShares;
                default:
                    // nothign
            }
        }

        // const timeline = [];

        // const currentMoment = moment(this.state.startDate);
        // const momentEndDate = moment(this.state.endDate);

        // while(currentMoment.isSameOrBefore(momentEndDate)) {
        //     const day = {
        //         date: currentMoment.format(),
        //         // todo: finish this.
        //     };

        //     currentMoment.add(1, 'days');
        // }
        // debugger;
        this.setState({
            shares: shares,
            events: events,
        });
    }

    sortDateAscending(aDate, bDate) {
        const momentADate = moment(aDate);
        const momentBDate = moment(bDate);

        if (momentADate.isBefore(momentBDate)) {
            return 1;
        } else if (momentADate.isAfter(momentBDate)) {
            return -1;
        } else {
            return 0;
        }
    }

    sortEventsByDate(eventA, eventB) {
        return this.sortDateAscending(eventB.date, eventA.date);
    }

    generatePayDates(firstPayCheckDate, endDate, payFrequency) {
        const momentFirstPayCheckDate = moment(firstPayCheckDate);
        let momentCurrentDate = moment(momentFirstPayCheckDate);
        const momentEndDate = moment(endDate);
        const results = [];

        const payFreqMap = {
            26: 14
        };

        const daysToAdd = payFreqMap[payFrequency];

        while (momentCurrentDate.isBefore(momentEndDate)) {
            const d = momentCurrentDate.format('YYYY-MM-DD');

            results.push(d);
            momentCurrentDate.add(daysToAdd, 'days');
        }

        return results;
    }

    renderEventList() {
        const eventListElement = this.state.events.map((event) => {
            debugger;
            return (
                <tr className="event-list">
                    <td>{ event.date }</td>
                    <td>{ event.type }</td>
                    <td>{ event.amount.toFixed(2) }</td>
                    <td>a</td>
                    <td>a</td>
                    <td>a</td>
                </tr>
            );
        });

        return (
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Share Price</th>
                        <th>Shares Purchased</th>
                        <th>Total Shares</th>
                    </tr>
                </thead>
                <tbody>
                    { eventListElement }
                </tbody>
            </table>
        );
    }

    render() {
        let frontLoadContributionElement;

        if(this.state.isFrontLoad) {
            frontLoadContributionElement = (
                <div className="field">
                    <label>
                        Frontload Contribution %
                    </label>
                    <input
                        type="number"
                        onChange={e =>
                            this.handleChange(
                                e,
                                'frontLoadContributionPercent'
                            )
                        }
                        value={this.state.frontLoadContributionPercent}
                        name="frontLoadContributionPercent"
                    />
                    %
                </div>                
            );
        };

        return (
            <div className="home-container">
                <h1>401K Front-Loading Tool - IS IT WORTH IT OR NOT?</h1>
                <div>
                    <h3>FAQ: What is Frontloading:</h3>
                    <p>Frontloading your 401k is where you max out your annual 401K contribution early in the calendar year (Jan 1st - Dec 31st). By maxing out early you're planting your investment seed as early as possible to maximize dividend growth.</p>
                    <h3>Methodology & Considerations</h3>
                    <ul>
                        <li>Fund: { this.state.securityName }</li>
                        <li>Each year the max annual contribution amount is reset/adjusted based on year.</li>
                        <li>Minumum Date: Jan 1st 2016</li>
                        <li>Doesn't account for salary growth</li>
                        <li>If markets are closed on a particular buy date, the nearest future price is used.</li>
                        <li>Due to the 401K being tax free contributions we do not consider it in the calculation. However, FICA/Social Security is still applied.</li>
                    </ul>
                </div>
                <div className="form">
                    <div className="field">
                        <label>Salary</label>
                        <input
                            type="number"
                            onChange={e => this.handleChange(e, 'salary')}
                            value={this.state.salary}
                            name="salary"
                        />
                    </div>
                    <div className="field">
                        <label>Employer Match</label>
                        <input
                            type="text"
                            onChange={e =>
                                this.handleChange(e, 'employerMatch')
                            }
                            value={this.state.employerMatch}
                            name="employerMatch"
                        />
                        %
                    </div>
                    <div className="field">
                        <label>
                            Pay Checks Per Year
                        </label>
                        <input
                            type="number"
                            onChange={e => this.handleChange(e, 'payFrequency')}
                            value={this.state.payFrequency}
                            name="payFrequency"
                        />
                    </div>
                    <div className="field">
                        <label>
                            1st Pay Check Date
                        </label>
                        <input
                            type="date"
                            onChange={e =>
                                this.handleDateChange(e, 'firstPayCheckDate')
                            }
                            value={this.state.firstPayCheckDate}
                            name="firstPayCheckDate"
                        />
                    </div>
                    <div className="field">
                        <label>Start Date</label>
                        <input
                            type="date"
                            onChange={e =>
                                this.handleDateChange(e, 'startDate')
                            }
                            value={this.state.startDate}
                            name="startDate"
                        />
                    </div>
                    <div className="field">
                        <label>End Date</label>
                        <input
                            type="date"
                            onChange={e => this.handleDateChange(e, 'endDate')}
                            value={this.state.endDate}
                            name="endDate"
                        />
                    </div>
                    <div className="field">
                        <label>Front Load?</label>
                        <input
                            type="checkbox"
                            checked={ this.state.isFrontLoad }
                            onChange={e => this.handleCheckboxChange(e, 'isFrontLoad')}
                      
                            name="frontload"
                        />
                    </div>
                    {
                        frontLoadContributionElement
                    }
                    <button onClick={() => this.calculate()}>CALCULATE!</button>
                    <div className="results">
                        <div>Shares: { this.state.shares }</div>
                        <div>Value: ${ (this.state.shares * this.state.currentShareValue).toFixed(2) }</div>
                    </div>
                </div>
                <div className="event-list">
                    { this.renderEventList() }
                </div>
            </div>
        );
    }
}

export default Home;
