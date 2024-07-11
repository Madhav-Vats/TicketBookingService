//axios is required bcoz we are going to fetch the 
// realtime price of the flight 
const axios = require('axios');

const { BookingRepository } = require('../repository/index');
const { ServiceError } = require('../utils/errors');

// rn our flight service is running in our local machine 
// when it will have its own server we will update the address
const { FLIGHT_SERVICE_PATH } = require('../config/serverConfig');

class BookingService {
    constructor() {
        this.bookingRepository = new BookingRepository();
    }
    async createBooking(data) {
        try {
            const flightId = data.flightId;

            //fetching the details of the flight concerned
            const getFlightRequestURL = `${FLIGHT_SERVICE_PATH}/api/v1/flights/${flightId}`;
            const response = await axios.get(getFlightRequestURL);

            //we do axios.data , bcoz we have some axios related data also and
            // for only json data is in the data property

            const flightData = response.data.data;

            // real time price of the flight 
            let priceOfTheFlight = flightData.price;


            // checking if required number of seats are available or not
            // if not then throw the error
            if(data.noOfSeats > flightData.totalSeats) {
                throw new ServiceError('Something went wrong in the booking process', 'Insufficient seats in the flight');
            }
            const totalCost = priceOfTheFlight * data.noOfSeats;

            // the pay load coming from tyhe user alredy consists of most of the 
            // details except the price 
            const bookingPayload = {...data, totalCost};

            // creating the booking in the database 
            const booking = await this.bookingRepository.create(bookingPayload);
            // not marking it booked initially


            //after booking we need to update the number of available seats on the flights server
            //we will need this url in the axios patch request
            const updateFlightRequestURL = `${FLIGHT_SERVICE_PATH}/api/v1/flights/${booking.flightId}`;
            console.log(updateFlightRequestURL);

            // making a patch request and decreasing the number of seats
            // AXIOS PATCH REQUEST (do read about it);
    
            await axios.patch(updateFlightRequestURL, {totalSeats: flightData.totalSeats - booking.noOfSeats});
            
            //after all this we mark  the booking as Booked
            const finalBooking = await this.bookingRepository.update(booking.id, {status: "Booked"});
        
            return finalBooking;
        } catch (error) { 
            console.log(error);
            if(error.name == 'RepositoryError' || error.name == 'ValidationError') {
                throw error;
            }
            throw new ServiceError();
        }
    }
}

module.exports = BookingService;
