import { motors } from '../database/motors';

const API_URL = 'https://jsonplaceholder.typicode.com/posts';

export const postMotor = async () => {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sniper Yamaha',
        type: 'Motorcycle',
        motorId: 1,
      }),
    });
    const data = await response.json();
    console.log('POST created:', data);
  } catch (error) {
    console.log('POST error:', error);
  }
};

export const putMotor = async () => {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        name: 'Honda Click',
        type: 'Scooter',
        motorId: 1,
      }),
    });
    const data = await response.json();
    console.log('PUT result:', data);
  } catch (error) {
    console.log('PUT error:', error);
  }
};

export const patchMotor = async () => {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Honda Mio',
      }),
    });
    const changes = { name: 'Honda Mio' };
    console.log('PATCH result:', { id: 1, type: 'Scooter', motorId: 1, ...changes });
  } catch (error) {
    console.log('PATCH error:', error);
  }
};

export const deleteMotor = async () => {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
      method: 'DELETE',
    });

    console.log('DELETED motor id 1, status:', response.status);
  } catch (error) {
    console.log('DELETE error:', error);
  }
};
