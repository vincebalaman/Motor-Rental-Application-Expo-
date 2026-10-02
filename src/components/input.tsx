import { StyleSheet, Text, TextInput, TouchableOpacity, View, type TextInputProps } from 'react-native';

type InputProps = TextInputProps & {
  type?: 'text' | 'password';
  isHidden?: boolean;
  togglePasswordVisibility?: () => void;
};

export default function Input(props: InputProps) {
  return (
    <View style={styles.container}>
      <TextInput
        {...props}
        style={[styles.input, props.style]}
        secureTextEntry={props.type === 'password' ? !!props.isHidden : !!props.secureTextEntry}
        autoCapitalize={props.autoCapitalize ?? 'none'}
      />
      {props.type === 'password' ? (
        <TouchableOpacity onPress={props.togglePasswordVisibility}>
          <Text>{props.isHidden ? '👁' : '𓂏'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#faf8f2',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    borderRadius: 4,
    paddingVertical: 14,
    fontSize: 15,
    color: '#203334',
  },
});