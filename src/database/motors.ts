export type Motor = {
    id: number;
    name: string;
    type: string;
    price: number;
    description: string;
    imageUrl: string;
};

export const motors: Motor[] = [
    {id: 1, name: 'Honda Civic', type: 'Compact', description: 'A reliable and fuel-efficient compact car.', price: 20000, imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1000&auto=format&fit=crop&q=80'},
    {id: 2, name: 'Toyota Camry', type: 'Midsize', description: 'A comfortable and spacious midsize sedan.', price: 25000, imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1000&auto=format&fit=crop&q=80'},
    {id: 3, name: 'Ford F-150', type: 'Truck', description: 'A powerful and versatile full-size pickup truck.', price: 30000, imageUrl: 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=1000&auto=format&fit=crop&q=80'},
    {id: 4, name: 'Chevrolet Tahoe', type: 'SUV', description: 'A large and capable SUV for family adventures.', price: 40000, imageUrl: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=1000&auto=format&fit=crop&q=80'},
    {id: 5, name: 'Tesla Model S', type: 'Electric', description: 'A high-performance electric sedan with cutting-edge technology.', price: 80000, imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1000&auto=format&fit=crop&q=80'},
];