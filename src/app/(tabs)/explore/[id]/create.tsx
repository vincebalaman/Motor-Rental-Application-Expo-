import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';


export default function Create() {
  const [productName, setProductName] = useState('');

  return (
    <MainSafe>
        <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
      <View style={styles.container}>
        <Text style={styles.header}>Create</Text>
        <TextInput style={styles.inputs} 
        placeholder="Enter something..." 
        placeholderTextColor="#94a3b8"
        value={productName}
        onChangeText={setProductName}
        />
      <SubmitButton title="Submit" onPress={console.log}/>
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
