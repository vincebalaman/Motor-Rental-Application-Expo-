import type { ComponentPropsWithRef } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, type StyleProp, type ViewStyle, TouchableOpacity, View } from 'react-native';

type InputProps = TextInputProps & {
  ref?: ComponentPropsWithRef<typeof TextInput>['ref'];
  containerStyle?: StyleProp<ViewStyle>;
  type?: 'password';
  isHidden?: boolean;
  togglePasswordVisibility?: () => void;
};

export default function Input({ type, isHidden = true, togglePasswordVisibility, containerStyle, style, secureTextEntry, ...props }: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? props.placeholder}
        underlineColorAndroid="transparent"
        style={[styles.input, style]}
        secureTextEntry={type === 'password' ? isHidden : secureTextEntry}
      />
      {type === 'password' && (
        <TouchableOpacity
          onPress={togglePasswordVisibility}
          disabled={props.editable === false}
          accessibilityRole="button"
          accessibilityLabel={isHidden ? 'Show password' : 'Hide password'}
          style={styles.toggle}
        >
          <Text>{isHidden ? 'Show' : 'Hide'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#faf8f2',
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    borderRadius: 4,
    paddingVertical: 14,
    fontSize: 15,
    color: '#203334',
  },
  toggle: { padding: 10 },
});
