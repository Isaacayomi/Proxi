import React from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";

interface LogoutButtonProps {
  onLogout: () => void;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ onLogout }) => {
  return (
    <View style={styles.container}>
      <Button
        mode="text"
        textColor="#BA3E46"
        onPress={onLogout}
        style={styles.button}
      >
        Logout
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    marginHorizontal: 16,
  },
  button: {
    borderRadius: 30,
  },
});

export default LogoutButton;
