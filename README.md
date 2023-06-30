# Token Example Contract

This is an example contract for a token on Koinos blockchain, that uses allowances and can be used on KoinDX. The contract provides functions for the creation, transfer, and management of tokens.

## Setup

Clone this repository.

```sh
git clone https://github.com/koindx/token-example.git
```

Make sure to have the required dependencies installed.

```sh
yarn install 
```

## Build

To build the contract, you can use the following commands:

```sh
# Build the debug version
yarn build:debug

# Build the release version
yarn build:release
```

Alternatively, you can use the koinos-sdk-as-cli tool to build the contract:

```sh
# Build the debug version
yarn exec koinos-sdk-as-cli build-all debug 0 token.proto

# Build the release version
yarn exec koinos-sdk-as-cli build-all release 0 token.proto
```

## Test

To run the contract tests, use the following command:

```sh
yarn test
```

Alternatively, you can use the koinos-sdk-as-cli tool to run the tests:

```sh
yarn exec koinos-sdk-as-cli run-tests
```

## Usage

To use the token contract, follow these steps:

1. Deploy the contract on a Koinos blockchain.
2. nteract with the contract using the available methods, such as approve, transfer, mint, etc.
3. Make sure to pass the required arguments when calling the contract methods.

Please refer to the contract code for more details on the available methods and their arguments.

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)

## Disclaimer

This repository contains example code for educational purposes only. It is not intended for production use and may not follow best practices or include all necessary security measures. The code provided here is for demonstration purposes and should be thoroughly reviewed and modified before being used in any real-world applications.

Using this code as a starting point for your own projects is at your own risk. The authors and contributors of this repository are not responsible for any damages or liabilities incurred from the use of this code.

Please use caution and exercise good judgment when working with this example code.
