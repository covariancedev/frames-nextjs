import { createSystem } from "@airstack/frog/ui";

export const {
  Box,
  Columns,
  Column,
  Divider,
  Heading,
  HStack,
  Icon,
  Image,
  Rows,
  Row,
  Spacer,
  Text,
  VStack,
  vars,
} = createSystem({
  colors: {
    white: "white",
    black: "black",
    fcPurple: "rgb(138, 99, 210)",
    primary: "rgb(33, 33, 33)",
    secondary: "rgb(255, 255, 255)",
    red: "#ff0000",
    green: "#00ff00",
    // ...vars.colors,
  },
  fonts: {
    default: [
      {
        name: "Inter",
        source: "google",
        weight: 400,
      },
      {
        name: "Inter",
        source: "google",
        weight: 600,
      },
    ],
  },
});
