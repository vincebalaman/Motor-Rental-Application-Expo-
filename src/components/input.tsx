import { Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function Input(props) {
  return (
    <View style={styles.container}>
      <TextInput style={styles.input} placeholder={props.placeholder} secureTextEntry={props.isHidden} onChangeText={props.onChangeText}/>
      {props.type === "password" ? 
      <TouchableOpacity onPress={props.togglePasswordVisibility}>
        {props.isHidden ? <Text>👁</Text> : <Text>𓂏</Text>}
      </TouchableOpacity>
      : null}
    </View>
  )
}

const styles = {
  container: {
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#faf8f2",
    paddingHorizontal: 10,
  },

    input: {
        flex: 1,
        borderRadius: 4,
        paddingVertical: 14,
        fontSize: 15,
        color: "#203334"
    }
}