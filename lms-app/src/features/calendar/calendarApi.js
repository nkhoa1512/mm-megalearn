import { initialRoomBookings } from '../../data/roomBookings';
import { meetingRoomsAndLabs } from '../../data/mockData';

export const calendarApi = {
  async getRoomBookings() {
    return initialRoomBookings;
  },
  async getRooms() {
    return meetingRoomsAndLabs;
  }
};

export default calendarApi;
