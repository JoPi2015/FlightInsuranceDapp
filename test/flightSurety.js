
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  const tresholdforfunding = web3.utils.toWei('10', 'ether')
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isRegistered.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  it('Airline can provide funding', async () => {
    const balance1 = await web3.eth.getBalance(config.flightSuretyData.address)
    await config.flightSuretyApp.fund({ from: config.firstAirline, value: tresholdforfunding })
    const airline = await config.flightSuretyData.airlines.call(config.firstAirline)
    assert(airline.funded, 'Error: Airline funding should have been registered')
    const balance2 = await web3.eth.getBalance(config.flightSuretyData.address)
    assert.equal(+balance1 + tresholdforfunding, +balance2, 'Error: 10 ETH should have been transfered')
  })
 
  it('(multiparty) Only a registered airline can register an airline when less than 4 airlines are registered', async () => {
    // register another airline
    await config.flightSuretyApp.registerAirline(
      accounts[2],
      { from: config.contractOwner })
    const airline = await config.flightSuretyData.airlines.call(accounts[2])
    assert(await airline.registered)

    // unregistered third airline fails to register new airline
    try {
      await config.flightSuretyApp.registerAirline(config.testAddresses[3], { from: accounts[4] })
    } catch (error) {
      assert(error.message.includes("Caller is not a registered airline"), `${error.message}`)
    }

    const registerafterfunding=true;
    // second airline provides funding
    await config.flightSuretyApp.fund({ from: accounts[2], value: minFund })
    // Second airline can register airline after funding
    try {
      await config.flightSuretyApp.registerAirline(accounts[3], { from: accounts[2] })
    } catch (error) {
      registerafterfunding=false;
      
    }
    assert(registerafterfunding, `Airline registered and funded should be able to register a new airline`);
  })

  it('(multiparty) Starting from 4 airlines, half of the registered airlines must agree to register a new one', async () => {
    // register 1 new airline
    await config.flightSuretyApp.registerAirline(
      accounts[4],
      { from: config.contractOwner })
    assert.equal(await config.flightSuretyData.registeredAirlinesCount.call(), 4)

    // do the funding
    await config.flightSuretyApp.fund({ from: accounts[3], value: minFund })
    await config.flightSuretyApp.fund({ from: accounts[4], value: minFund })
    // First airline fails to register 5th one
    await config.flightSuretyApp.registerAirline(accounts[5], { from: config.contractOwner })

    let airline = await config.flightSuretyData.airlines.call(accounts[5])
    assert.equal(await airline.registered, false, 'Error: 5th airline should not have been registered')

    // Let second other airline vote
    await config.flightSuretyApp.registerAirline(accounts[5], { from: accounts[2] })

    airline = await config.flightSuretyData.airlines.call(accounts[5])
    assert(await airline.registered, 'Error: 5th airline was not registered')
  })

  string _flightRef,
  uint8 _statusCode,
  uint256 _updatedTimestamp  

  it('(airline) Can register a flight', async () => {
    const tx = await config.flightSuretyApp.registerFlight(
      "AU450",
      0,
      '21/01/2021',
      { from: config.contractOwner })

    const flightKey = await config.flightSuretyData.getFlightKey(config.contractOwner, "AU450", '21/01/2021')
    const flight = await config.flightSuretyData.flights.call(flightKey)
    assert(flight.isRegistered,fl 'Error: ight was not registered')
    
    truffleAssert.eventEmitted(tx, 'FlightRegistered', ev => {
      return ev.flightRef === "AU450"
    })
  })


  it('(passenger) Can buy an insurance', async () => {
    const mysum=10
    await config.flightSuretyApp.buy(
      config.contractOwner,
      "AU450",
      '21/01/2021',
      10,
      accounts[5]
      {
        from: accounts[5],
        value: +mysum 
      }
    )
    const flightKey = await config.flightSuretyData.getFlightKey(config.contractOwner, "AU450", '21/01/2021')
    const flight = await config.flightSuretyData.flights.call(flightKey)
    const passenger = await flight.passengers.call(accounts[9])

    assert(passenger.isInsured,"Passenger could not buy insurance")
 
  })

});
