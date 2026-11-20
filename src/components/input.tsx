import { type ComponentPropsWithRef, type ComponentRef, useImperativeHandle, useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, type StyleProp, type ViewStyle, TouchableOpacity } from 'react-native';

type InputProps = TextInputProps & {
  ref?: ComponentPropsWithRef<typeof TextInput>['ref'];
  containerStyle?: StyleProp<ViewStyle>;
  type?: 'password';
  isHidden?: boolean;
  togglePasswordVisibility?: () => void;
};

export default function Input({ ref, type, isHidden = true, togglePasswordVisibility, containerStyle, style, secureTextEntry, ...props }: InputProps) {
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  useImperativeHandle(ref, () => inputRef.current!, []);
  return (
    <Pressable
      accessible={false}
      style={[styles.container, containerStyle]}
      onPress={() => { if (props.editable !== false) inputRef.current?.focus(); }}
    >
      <TextInput
        {...props}
        ref={inputRef}
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
    </Pressable>
  );
}

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
