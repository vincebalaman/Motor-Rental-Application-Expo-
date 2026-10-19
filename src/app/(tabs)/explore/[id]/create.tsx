import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Input from '@/components/input';


export default function Create() {
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDescription, setProductDescription] = useState('');

  const saveProduct = () => {
    // Implement the logic to save the product details to your database or state management
    console.log('Product Name:', productName);
    console.log('Product Type:', productType);
    console.log('Product Price:', productPrice);
    console.log('Product Description:', productDescription);
  }



  return (
    <MainSafe>
        <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
      <View style={styles.container}>
        <Text style={styles.header}>Create</Text>
        <Input 
          placeholder="Name" 
          placeholderTextColor="#94a3b8"
          value={productName}
          onChangeText={setProductName}
        />
        <Input 
          placeholder="Type" 
          placeholderTextColor="#94a3b8"
          value={productType}
          onChangeText={setProductType}
        />
        <Input 
          placeholder="Price" 
          placeholderTextColor="#94a3b8"
          value={productPrice}
          onChangeText={setProductPrice}
        />
        <Input 
          placeholder="Description" 
          placeholderTextColor="#94a3b8"
          value={productDescription}
          onChangeText={setProductDescription}
        />
      <SubmitButton title="Submit" onPress={saveProduct}/>
      </View>
    </MainSafe>
  )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center'
    },
    inputs: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        paddingVertical: 12,
    },
    header: {
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 24
    },
    back: { color: '#21484a', fontSize: 16, fontWeight: '600' },
})
