
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })
    
    });
    

    function ManageFlights () {
        var flights=Contract.listflights();
        for (var flight in flights){
            let datalist = DOM.elid('flights');
            idx=flight['index'];
            ref=flight["ref"];
            airline=flight["airline"];
            tmstmp=flight["timestamp"];
            let option = DOM.option({ value: `${idx} - ${airline} - ${ref} - ${tmstmp}` });
            datalist.appendChild(option);
            datalist = DOM.elid('oracle-requests')
            datalist.appendChild(option);
        }
      }
      ManageFlights()

      DOM.elid('submit-oracle').addEventListener('click', async () => {
        // destructure
        let input = DOM.elid('oracle-request').value
        input = input.split('-')
        input = input.map(el => { return el.trim() })
        let [airline, flight, timestamp] = input
        landing = new Date(landing).getTime()
        // Write transaction
        await contract.fetchFlightStatus(airline, flight, timestamp)
      })

      DOM.elid('register-airline').addEventListener('click', async () => {
        const newAirline = DOM.elid('regAirlineAddress').value
        await contract.registerAirline(newAirline)
        const { suscriber, error, success, votes } = await contract.registerAirline(newAirline)
        display(
          `Airline ${sliceAddress(suscriber)}`,
          'Register Airline', [{
            label: sliceAddress(newAirline),
            value: `${votes} more vote(s) required`
          }]
        )
      })
      DOM.elid('register-flight').addEventListener('click', async () => {
            const ref = DOM.elid('regFlightRef').value
            const status = DOM.elid('regFlightStatus').value
            const tmstmp = DOM.elid('regFlighTime').value
            await contract.registerFlight(ref,status,tmstmp)
          })

      DOM.elid('fund').addEventListener('click', () => {
            let amount = DOM.elid('fundAmount').value
            contract.fund(amount, (error, result) => {
              display(`Airline ${sliceAddress(result.address)}`, 'Provide Funding', [{
                label: 'Funding',
                error: error,
                value: `${result.amount} ETH` }])
            })
          })

      // Book flight
    DOM.elid('buy').addEventListener('click', async () => {
            // destructure and get index
            let input = DOM.elid('buyInsurance').value
            input = input.split('-')
            input = input.map(el => { return el.trim() })
            const flightreference = input[0]
            const insurance = DOM.elid('InsuranceAmount').value
            // Fetch args from server
            var flights=Contract.listflights();
            for (var flight in flights){
              const idx=flight['index'];
              if (ref==flightreference){
                const ref=flight['ref'];
                const flighttime=flight['timestamp'];
                const airline=flight['airline'];
                const { passenger, error } = await book (ref,flighttime,airline,insurance);
                display(
                  `Passenger ${sliceAddress(passenger)}`,
                  'Buy Insurance',
                  [{
                    label: `${ref} by ${airline} departure ${flighttime}`,
                    error: error,
                    value: `insurance: ${insurance} ETH`
                  }]
                )
              }
            }
          })
    DOM.elid('pay').addEventListener('click', () => {
      try {
        contract.withdraw()
        } catch (error) {
          console.log(error.message)
        }
      })
    })            
      
})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}


function sliceAddress (address) {
  return `${address.slice(0, 5)}...${address.slice(-5)}`
}


