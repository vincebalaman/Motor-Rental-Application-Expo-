import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function HomeScreen() {
  const [form, setForm] = useState({
    firstname: "",
    middlename: "",
    lastname: "",
    age: "",
    gender: "",
  });

  const [users, setUsers] = useState([]);

  const setChange = (field) => (value) => {
    setForm({ ...form, [field]: value });
  };

  const addUsers = () => {
    const updatedUsers = [...users, form];

    setUsers(updatedUsers);

    console.log(`First Name: ${form.firstname}`);
    console.log(`Middle Name: ${form.middlename}`);
    console.log(`Last Name: ${form.lastname}`);
    console.log(`Age: ${form.age}`);
    console.log(`Gender: ${form.gender}`);
import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const handleCreateAccount = () => {
    Alert.alert('Account Registered', 'Your account has been created successfully.');
    console.log('Full Name:', fullName);
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Confirm Password:', confirmPassword);
  };

  return (
    <View style={styles.container}>
      {/* 🌊 Decorative Water */}
      <View style={styles.waterDecoration}>
        <Text style={styles.starfish}>★</Text>
      </View>

      {/* 🏖️ Decorative Sand */}
      <View style={styles.sandDecoration}>
        <Text style={styles.shell}>◒</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>🏍</Text>
          </View>

          <Text style={styles.logo}>RideEasy</Text>

          <Text style={styles.logoSubtitle}>MOTORCYCLE RENTAL</Text>

          <Text style={styles.welcome}>Welcome, Rider!</Text>

          <Text style={styles.description}>
            Enter your information to get started.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Rider Information</Text>

          <Text style={styles.formSubtitle}>
            Tell us a little about yourself
          </Text>

          {/* First Name */}
          <Text style={styles.label}>First Name</Text>

          <TextInput
            style={styles.textInput}
            placeholder="Juan"
            placeholderTextColor="#9AAEB0"
            onChangeText={setChange("firstname")}
          />

          {/* Middle Name */}
          <Text style={styles.label}>Middle Name</Text>

          <TextInput
            style={styles.textInput}
            placeholder="Dela"
            placeholderTextColor="#9AAEB0"
            onChangeText={setChange("middlename")}
          />

          {/* Last Name */}
          <Text style={styles.label}>Last Name</Text>

          <TextInput
            style={styles.textInput}
            placeholder="Cruz"
            placeholderTextColor="#9AAEB0"
            onChangeText={setChange("lastname")}
          />

          {/* Age */}
          <Text style={styles.label}>Age</Text>

          <TextInput
            style={styles.textInput}
            placeholder="42"
            placeholderTextColor="#9AAEB0"
            keyboardType="numeric"
            onChangeText={setChange("age")}
          />

          {/* Gender */}
          <Text style={styles.label}>Gender</Text>

          <TextInput
            style={styles.textInput}
            placeholder="Male"
            placeholderTextColor="#9AAEB0"
            onChangeText={setChange("gender")}
          />

          {/* Submit */}
          <Pressable style={styles.button} onPress={addUsers}>
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </View>

        {/* Small Footer */}
        <Text style={styles.footer}>Ride easy. Explore freely. </Text>
      </ScrollView>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Sign up to start renting motors:</Text>

      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#94a3b8"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email address"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter your password"
            placeholderTextColor="#94a3b8"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleCreateAccount}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* =========================
     MAIN BACKGROUND
  ========================= */

  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },

  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 40,
  },

  /* =========================
     BEACH DECORATIONS
  ========================= */

  waterDecoration: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 130,
    backgroundColor: "#D9ECEA",
    top: -130,
    left: -100,
  },

  sandDecoration: {
    position: "absolute",
    width: 230,
    height: 170,
    borderRadius: 120,
    backgroundColor: "#E8D4B3",
    bottom: -80,
    right: -100,
  },

  starfish: {
    position: "absolute",
    right: 30,
    bottom: 35,
    fontSize: 28,
    color: "#D58D6D",
    transform: [{ rotate: "25deg" }],
  },

  shell: {
    position: "absolute",
    left: 35,
    top: 35,
    fontSize: 30,
    color: "#C9A66B",
  },

  /* =========================
     HEADER
  ========================= */

  header: {
    alignItems: "center",
    marginBottom: 25,
  },

  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E3F0EF",
    borderWidth: 3,
    borderColor: "#C9A66B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  logoIcon: {
    fontSize: 38,
  },

  logo: {
    fontSize: 38,
    fontWeight: "800",
    fontStyle: "italic",
    color: "#315D60",
    letterSpacing: -1,
  },

  logoSubtitle: {
    fontSize: 10,
    letterSpacing: 3,
    color: "#5F9294",
    fontWeight: "700",
    marginTop: 3,
  },

  welcome: {
    fontSize: 25,
    fontWeight: "700",
    color: "#294B4D",
    marginTop: 28,
  },

  description: {
    fontSize: 14,
    color: "#718789",
    marginTop: 6,
  },

  /* =========================
     FORM CARD
  ========================= */

  formContainer: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 24,

    borderWidth: 1,
    borderColor: "#DCE6E4",

    shadowColor: "#315D60",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,

    elevation: 3,
  },

  formTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#294B4D",
    marginBottom: 4,
  },

  formSubtitle: {
    fontSize: 13,
    color: "#8A9B9C",
    marginBottom: 20,
  },

  /* =========================
     INPUTS
  ========================= */

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#315D60",
    marginBottom: 7,
  },

  textInput: {
    width: "100%",
    height: 52,

    backgroundColor: "#F8FBFA",

    borderWidth: 1,
    borderColor: "#D7E3E1",

    borderRadius: 14,

    paddingHorizontal: 15,

    fontSize: 15,
    color: "#294B4D",

    marginBottom: 15,
  },

  /* =========================
     BUTTON
  ========================= */

  button: {
    height: 55,
    backgroundColor: "#5F9294",

    borderRadius: 15,

    justifyContent: "center",
    alignItems: "center",

    marginTop: 8,

    shadowColor: "#315D60",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 6,

    elevation: 3,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  /* =========================
     FOOTER
  ========================= */

  footer: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 13,
    color: "#7A9293",
  },
});
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 28,
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 2,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
