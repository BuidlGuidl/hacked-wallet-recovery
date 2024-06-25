type CustomAbiNinjaExtract = {
  contractAddress: string | undefined;
  data: string | undefined;
};

export const extractAbiNinjaCallDetails = (input: string): CustomAbiNinjaExtract => {
  // Define the regex pattern to match the specific structure of the input string
  const pattern = /Custom abininja call to (0x[a-fA-F0-9]+) with data (0x[a-fA-F0-9]+)/;
  const match = input.match(pattern);

  if (match && match.length >= 3) {
    // If a match is found, return the extracted contractAddress and data
    return {
      contractAddress: match[1],
      data: match[2],
    };
  }

  // If no match is found, return null values
  return { contractAddress: undefined, data: undefined };
};

export const formatCalldataString = (data: string | undefined) => {
  if (data === undefined) return "";
  // Check if the data length is more than 10 to ensure there are characters to trim
  if (data.length > 10) {
    const firstFive = data.substring(0, 5);
    const lastFive = data.substring(data.length - 5);
    const middleLength = data.length - 10; // Subtract the first and last five characters from the total length
    return `${firstFive}..(${middleLength})..${lastFive}`;
  }
  // If data is not longer than 10 characters, return it as is
  return data;
};
