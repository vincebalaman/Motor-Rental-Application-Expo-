import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';


export default function HomeScreen() {
  const [form, setForm] = useState({
    firstname: '',
    middlename: '',
    lastname: '',
    age: '',
    gender: '',
  });

  const [users, setUsers] = useState([])

  const setChange = (field) => (value) => {
    setForm({...form, [field]: value })
  };

  const addUsers = () => {
    const updatedUsers = [...users, form];
    
    setUsers(updatedUsers);

    console.log(`First Name: ${form.firstname}`);
    console.log(`Middle Name: ${form.middlename}`);
    console.log(`Last Name: ${form.lastname}`);
    console.log(`Age: ${form.age}`);
    console.log(`Gender: ${form.gender}`);
  };

  return (
    <View style={styles.Container}>
      <View style={styles.formContainer}>
        <Text>First Name:</Text>
        <TextInput 
          style={styles.textInput} 
          placeholder= "Juan"
          placeholderTextColor="gray"
          onChangeText={setChange('firstname')}
        />

        <Text>Middle Name:</Text>
        <TextInput 
          style={styles.textInput} 
          placeholder= "Dela"
          placeholderTextColor="gray"
          onChangeText={setChange('middlename')}
        />

        <Text>Last Name:</Text>
        <TextInput 
          style={styles.textInput} 
          placeholder= "Cruz"
          placeholderTextColor="gray"
          onChangeText={setChange('lastname')}
        />

        <Text>Age:</Text>
        <TextInput 
          style={styles.textInput} 
          placeholder= "42"
          placeholderTextColor="gray"
          onChangeText={setChange('age')}
        />

        <Text>Gender:</Text>
        <TextInput 
          style={styles.textInput} 
          placeholder= "Male"
          placeholderTextColor="gray"
          onChangeText={setChange('gender')}
        />

        <Pressable style={styles.button} onPress={addUsers}>
          <Text>Submit</Text>
        </Pressable>
      </View>
    </View>


  );
}

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'lightgray',
    padding: 2,
  },

  formContainer: {
    justifyContent: 'center',
    padding: 16,        
    backgroundColor: 'white',
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 12,
    alignSelf: 'center',
    gap: 8,
    shadowColor: 'gray',
  },

  textInput: {
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    padding: 2,
    borderColor: 'black',
    borderWidth: 2,
    alignSelf: 'center',
  },

  button: {
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    padding: 6,
    borderColor: 'black',
    borderWidth: 2,
    alignSelf: 'center',
    backgroundColor: 'lightgray',
    borderRadius: 6,
  }
});
