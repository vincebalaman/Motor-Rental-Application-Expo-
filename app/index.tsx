import React from "react";
import {
    Dimensions,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* ROUND LOGO */}
        <Image
          source={require("../assets/images/moto-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* APP NAME */}
        <Text style={styles.appName}>
          MOTO <Text style={styles.appNameGold}>RENTAL</Text>
        </Text>

        {/* TAGLINE */}
        <View style={styles.taglineContainer}>
          <View style={styles.line} />

          <Text style={styles.tagline}>RENT. RIDE. EXPLORE.</Text>

          <View style={styles.line} />
        </View>

        {/* WELCOME */}
        <Text style={styles.welcome}>YOUR JOURNEY STARTS HERE</Text>

        {/* DESCRIPTION */}
        <Text style={styles.description}>
          Find the perfect motorcycle for your next adventure.
          {"\n"}
          Ride with comfort, freedom, and confidence.
        </Text>

        {/* BROWSE BUTTON */}
        <TouchableOpacity style={styles.browseButton}>
          <Text style={styles.motorcycleIcon}></Text>

          <View style={styles.buttonDivider} />

          <Text style={styles.browseText}>BROWSE MOTORCYCLES</Text>
        </TouchableOpacity>

        {/* LOGIN BUTTON */}
        <TouchableOpacity style={styles.loginButton}>
          <Text style={styles.loginText}>LOGIN</Text>
        </TouchableOpacity>

        {/* CREATE ACCOUNT */}
        <View style={styles.accountContainer}>
          <Text style={styles.accountText}>Don't have an account?</Text>

          <TouchableOpacity>
            <Text style={styles.createText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E5E1E1",
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },

  /* ROUND LOGO */
  logo: {
    width: width * 0.48,
    height: width * 0.48,
    maxWidth: 230,
    maxHeight: 230,
    marginBottom: 5,
  },

  /* MOTO RENTAL */
  appName: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#42686C",
    marginTop: 5,
  },

  appNameGold: {
    color: "#B6A17C",
  },

  /* TAGLINE */
  taglineContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 30,
  },

  line: {
    height: 2,
    width: 45,
    backgroundColor: "#B6A17C",
    marginHorizontal: 10,
  },

  tagline: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: "#42686C",
  },

  /* WELCOME */
  welcome: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#42686C",
    textAlign: "center",
    marginBottom: 12,
  },

  /* DESCRIPTION */
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: "#42686C",
    textAlign: "center",
    paddingHorizontal: 15,
    marginBottom: 30,
  },

  /* BROWSE BUTTON */
  browseButton: {
    width: "100%",
    height: 65,
    backgroundColor: "#42686C",
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "#B6A17C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  motorcycleIcon: {
    fontSize: 28,
    color: "#F7F6F2",
  },

  buttonDivider: {
    height: 35,
    width: 1,
    backgroundColor: "#F7F6F2",
    marginHorizontal: 18,
    opacity: 0.8,
  },

  browseText: {
    color: "#F7F6F2",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1,
  },

  /* LOGIN BUTTON */
  loginButton: {
    width: "100%",
    height: 60,
    backgroundColor: "#F7F6F2",
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#42686C",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },

  loginText: {
    color: "#42686C",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 2,
  },

  /* CREATE ACCOUNT */
  accountContainer: {
    alignItems: "center",
  },

  accountText: {
    color: "#42686C",
    fontSize: 14,
    marginBottom: 5,
  },

  createText: {
    color: "#B6A17C",
    fontSize: 15,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
