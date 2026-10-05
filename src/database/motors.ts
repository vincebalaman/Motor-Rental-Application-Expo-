export type motor = {
    id: number;
    name: string;
    type: string;
    price: number;
    description: string;
};

export const motors: motor[] = [
    {id: 1, name: 'Honda Civic', type: 'Compact', description: 'A reliable and fuel-efficient compact car.', price: 20000},
    {id: 2, name: 'Toyota Camry', type: 'Midsize', description: 'A comfortable and spacious midsize sedan.', price: 25000},
    {id: 3, name: 'Ford F-150', type: 'Truck', description: 'A powerful and versatile full-size pickup truck.', price: 30000},
    {id: 4, name: 'Chevrolet Tahoe', type: 'SUV', description: 'A large and capable SUV for family adventures.', price: 40000},
    {id: 5, name: 'Tesla Model S', type: 'Electric', description: 'A high-performance electric sedan with cutting-edge technology.', price: 80000},
];