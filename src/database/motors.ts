export type Motor = {
    id: number;
    name: string;
    type: string;
    price: number;
    description: string;
    imageUrl: string;
};

export const motors: Motor[] = [
    {
        id: 1, 
        name: 'Honda CBR600RR', 
        type: 'Sport', 
        description: 'A high-revving, agile supersport motorcycle built for track precision and road performance.', 
        price: 12000, 
        imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1000&auto=format&fit=crop&q=80'
    },
    {
        id: 2, 
        name: 'Yamaha MT-07', 
        type: 'Naked', 
        description: 'A versatile and torque-rich hyper-naked bike with aggressive styling and comfortable ergonomics.', 
        price: 8200, 
        imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1000&auto=format&fit=crop&q=80'
    },
    {
        id: 3, 
        name: 'BMW R 1250 GS', 
        type: 'Adventure', 
        description: 'The ultimate adventure touring bike engineered to tackle both long highways and rugged off-road paths.', 
        price: 18000, 
        imageUrl: 'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=1000&auto=format&fit=crop&q=80'
    },
    {
        id: 4, 
        name: 'Harley-Davidson Iron 883', 
        type: 'Cruiser', 
        description: 'An iconic, blacked-out cruiser delivering raw V-Twin power and classic American style.', 
        price: 11200, 
        imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1000&auto=format&fit=crop&q=80'
    },
    {
        id: 5, 
        name: 'Zero SR/F', 
        type: 'Electric', 
        description: 'A premium, high-torque electric motorcycle offering effortless acceleration and customizable performance profiles.', 
        price: 20000, 
        imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1000&auto=format&fit=crop&q=80'
    },
];