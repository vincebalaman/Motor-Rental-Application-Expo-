import MainSafe from '@/components/mainsafe'
import SubmitButton from '@/components/submitbtn'
import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

export default function Create() {
  const [productName, setProductName] = useState('');

  return (
    <MainSafe>
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
    }
})
