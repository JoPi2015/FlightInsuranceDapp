import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }
    listflights(){
        let self=this;
        let listkey=self.flightSuretyApp.methods.listflights();
        let result=[];
        for (key in listkey){
            var flight={};
            flight['index']=self.flightSuretyApp.methods.read_flight_index(key);
            flight['ref']=self.flightSuretyApp.methods.read_flight_ref(key);
            flight['airline']=self.flightSuretyApp.methods.read_flight_airline(key);
            flight['timestamp']=self.flightSuretyApp.methods.read_flight_timestamp(key);
            result.push(flight);
        }
        return result;
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    async registerAirline (airline) {
        try {
        const success, votes=await this.flightSuretyApp.methods
            .registerAirline(airline)
            .send({ from: this.account })
            return {
                address: this.account,
                vote: votes,
                success: success
            }
        } catch (error) {
            return {
                error: error
            }
        }
    }

    async registerFlight (flightRef, statuscode, timestamp) {
        try {
          
          await this.flightSuretyApp.methods
            .registerFlight(flightRef, statuscode, timestamp)
            .send({ from: this.account })
          return {
            address: this.account,
            error: ''
          }
        } catch (error) {
          return {
            address: this.account,
            error: error
          }
        }
    }

    fund (amount, callback) {
        let self = this
        self.flightSuretyApp.methods
          .FundMyAirline()
          .send({
            from: self.account,
            value: self.web3.utils.toWei(amount, 'ether')
          }, (error, result) => {
            callback(error, { address: self.account, amount: amount })
          })
    }


     
    async book (flightref,timestamp,airline,amount){
        let total = amount.toString()
        const amount = this.web3.utils.toWei(insurance.toString(), 'ether')
        try {
          await this.flightSuretyApp.methods
            .buy(airline, flightref, timestamp, amount,this.account)
            .send({
              from: this.account,
              value: this.web3.utils.toWei(total.toString(), 'ether')
            })
          return { passenger: this.account }
        } catch (error) {
          console.log(error)
          return {
            error: error
          }
        }
      }
    
      async withdraw () {
        await this.flightSuretyApp.methods
          .pay(this.account)
          .send({ from: this.account })
      }

}