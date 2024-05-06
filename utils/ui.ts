import { createSystem } from "frog/ui";

export const {
  Box,
  Heading,
  Text,
  VStack,
  vars,
  Spacer,
  Divider,
  Column,
  Columns,
  Icon,
  Image,
} = createSystem({
  colors: {
    white: "white",
    black: "black",
    fcPurple: "rgb(138, 99, 210)",
    primary: "rgb(33, 33, 33)",
    secondary: "rgb(255, 255, 255)",
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
