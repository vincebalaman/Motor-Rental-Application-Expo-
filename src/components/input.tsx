import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react';
import { StyleSheet, Text, TextInput, type StyleProp, type ViewStyle, TouchableOpacity, View } from 'react-native';

type InputProps = ComponentPropsWithoutRef<typeof TextInput> & {
  containerStyle?: StyleProp<ViewStyle>;
  type?: 'password';
  isHidden?: boolean;
  togglePasswordVisibility?: () => void;
};

const Input = forwardRef<ComponentRef<typeof TextInput>, InputProps>(function Input(
  { type, isHidden = true, togglePasswordVisibility, containerStyle, style, secureTextEntry, ...props },
  ref,
) {
  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        {...props}
        ref={ref}
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
});

export default Input;

const styles = StyleSheet.create({
  container: {
    minHeight: 54,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#faf8f2',
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    textAlignVertical: 'center',
    borderRadius: 4,
    paddingVertical: 14,
    fontSize: 15,
    color: '#203334',
  },
  toggle: { padding: 10 },
});
