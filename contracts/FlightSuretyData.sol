pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    
    // Airlines
    struct Airline {
        bool registered;
        bool funded;
    }
    
    mapping(address => bool) private authorizedcallers;

    mapping(address => Airline) private airlines;
    uint256 private countairlines;

    // passengers
    struct Passenger {
        address account;
        bytes32 flighkey;
        bool isInsured;
        uint256 amount;
        bool isCredited;
    }

    //flights
    struct Flight {
        uint256 index;
        string flightRef;
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
        mapping(address =>Passenger) bookingstatus;
    }
    
    mapping(bytes32 => Flight) private flights; 
    bytes32[] public flightKeys; // used in the Dapp to list the flights
    uint256 flightcount; 
    address[] passengers_all_flight;

    uint256 public insurance_cap=1 ether;
    mapping(address => uint) totransfert;
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AirlineRegistered(address airline_mum, address airline);
    event AirlineFunded(address airline);
    event FlightRegistered(string flightRef, uint256 updatedTimestamp,address airline);
    event FlightStatusUpdated(address airline,string flight,uint256 timestamp,uint256 statusCode);
    event IsInsured(bytes32 flightKey, address passenger_account,uint amount);
    event Credited(address passenger,uint256 amount);
    event Paid(address clientaddress, uint amount);
    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    address mycontractowner
                                ) 
                                public 
    {
        contractOwner = mycontractowner;
        authorizedcallers[contractOwner]=true;
        authorizedcallers[msg.sender]=true;
        airlines[contractOwner].registered=true;
        airlines[msg.sender].registered=true;
        flightcount=0;
        countairlines=2;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAuthorizedAddress(){
        require(authorizedcallers[msg.sender],"Caller is not authorize");
        _;
    }
    
    modifier requireRegisteredFlight(string flightref,uint256 timestamp, address airline){
        require(IsFlightRegistered(airline,flightref,timestamp),"Flight not registered by airline");
        _;
    }

    modifier requireReassonnableAmount(uint256 amount){
        require(amount < insurance_cap, "Amount too big should be below 1 ETH");
        require(amount > 0,"Can't pay nothing to get insured !");
        _;
    }
    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }


    function authorize_this_caller(address newcaller) external requireContractOwner {
        authorizedcallers[newcaller]=true;
    }

    function unauthorize_this_caller(address oldcaller) external requireContractOwner {
        authorizedcallers[oldcaller]=false;
    }
    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    *       This function won't check the number of airlines and ask for vote, it simply registers a new airline
    *       The checks and vote are done at FlightSuretyApp level
    *       Thus FlightSuretyApp will need to read the number of airlines -> CountAirline()
    *       and check if the origin airline is registered -> isRegistered(address airline)
    */   
    function registerAirline
                            (   
                                address airline,
                                address airline_mum
                            )
                            external
                            requireAuthorizedAddress
    {
        
        airlines[airline].registered=true;
        countairlines+=1;
        emit AirlineRegistered(airline_mum, airline);
    }

    function CountAirline() external requireAuthorizedAddress requireIsOperational returns (uint256 _Count) {
        _Count=countairlines;
    }

    function isRegistered(address airline) external requireAuthorizedAddress requireIsOperational returns (bool _registered){
        _registered=airlines[airline].registered;
    }
    function isFunded(address airline) external requireAuthorizedAddress requireIsOperational returns (bool _funded){
        _funded=airlines[airline].funded;
    }
    function fundAirline
                            (
                                address addrfunded   
                            )
                            public
                            requireAuthorizedAddress
                            payable

    {
        airlines[addrfunded].funded=true;
        emit AirlineFunded(addrfunded);
    }
   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (       
                                address airline,
                                string flightRef,
                                uint256 timestamp,
                                uint256 amount,
                                address passenger_account
                                                      
                            )
                            external
                            requireIsOperational
                            requireAuthorizedAddress
                            requireReassonnableAmount(amount)
                            requireRegisteredFlight(flightRef,timestamp, airline)
    {
        bytes32 flightkey=getFlightKey(airline,flightRef,timestamp);

        if (flights[flightkey].bookingstatus[passenger_account].isInsured==false){
            Passenger memory passenger=Passenger (
                passenger_account,
                flightkey,
                true,
                amount,
                false
            );
            
            flights[flightkey].bookingstatus[passenger_account]=passenger;
            passengers_all_flight.push(passenger_account);
            emit IsInsured(flightkey, passenger_account,amount);
        }
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    address airline,
                                    string flightRef,
                                    uint256 timestamp
                                )
                                external
                                requireIsOperational
                                requireAuthorizedAddress
                                requireRegisteredFlight(flightRef,timestamp, airline)
    {
        bytes32 flightKey=getFlightKey(airline,flightRef,timestamp);
        
        for (uint i = 0; i < passengers_all_flight.length; i++) {
            address read=passengers_all_flight[i];
            if (flights[flightKey].bookingstatus[read].isInsured){
                if (flights[flightKey].bookingstatus[read].isCredited==false){
                    flights[flightKey].bookingstatus[read].isCredited=true;
                    uint withdrawamount=uint(3*flights[flightKey].bookingstatus[read].amount/2);
                    totransfert[read]=withdrawamount;
                    emit Credited(read, withdrawamount);
                }
            }
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                                address clientaddress
                            )
                            external
                            requireIsOperational
                            requireAuthorizedAddress
    {
        {
            require(totransfert[clientaddress] > 0, "Found not amount to be transferred");
            uint amount = totransfert[clientaddress];
            totransfert[clientaddress] = 0;     
            clientaddress.transfer(amount);
            emit Paid(clientaddress, amount);
        }
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            ( 
                            )
                            public
                            payable

    {

    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }
    function RegisterFlight
        (
            string _flightRef,
            uint8 _statusCode,
            uint256 _updatedTimestamp,        
            address _airline
        ) 
        requireIsOperational
        requireAuthorizedAddress
        external {
            Flight memory flight = Flight(
                flightcount,
                _flightRef,
                true,
                _statusCode,
                _updatedTimestamp,
                _airline
            );
            flightcount=flightcount+1;
            bytes32 flightKey = getFlightKey(_airline,_flightRef,_updatedTimestamp);
            flights[flightKey] = flight;
            flightKeys.push(flightKey);
            emit FlightRegistered(_flightRef, _updatedTimestamp,_airline);
    }
    function listflights() public returns (bytes32[]){
        return flightKeys;
    }
    function read_flight_index(bytes32 flightKey)public returns (uint256){
        return flights[flightKey].index;
    }
    function read_flight_ref(bytes32 flightKey) public returns(string){
        return flights[flightKey].flightRef;
    }
    function read_flight_airline(bytes32 flightKey) public returns(address){
        return flights[flightKey].airline;
    }
    function read_flight_timestamp(bytes32 flightKey) public returns(uint256){
        return flights[flightKey].updatedTimestamp;
    }


    function processFlightStatus
        (
            address airline,
            string flight,
            uint256 timestamp,
            uint8 statusCode
        )         
            requireIsOperational
            requireAuthorizedAddress
            external {
                bytes32 flightkey=getFlightKey(airline,flight,timestamp);
                flights[flightkey].statusCode=statusCode;
                emit FlightStatusUpdated(airline,flight,timestamp,statusCode);
        }
    function IsFlightRegistered
        (
            address airline,
            string flight,
            uint256 timestamp
        ) 
            requireIsOperational
            requireAuthorizedAddress
            public
            view
            returns(bool) 
            {
                bytes32 flightkey=getFlightKey(airline,flight,timestamp);
                return flights[flightkey].isRegistered;
            }
                

}

