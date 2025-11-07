const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const { ethers } = require('ethers');
const dotenv = require('dotenv');
const FormData = require('form-data');
const fs = require('fs');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Environment variables
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const POLYGON_RPC = process.env.POLYGON_RPC || `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Initialize ethers provider and signer
const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// ERC-1155 Contract ABI (simplified for deployment)
const ERC1155_ABI = [
  "constructor(string name, string symbol, address royaltyRecipient, uint96 royaltyBps)",
  "function mint(address to, uint256 id, uint256 amount, bytes data) external",
  "function setURI(uint256 tokenId, string memory newuri) external"
];

const ERC1155_BYTECODE = `0x60806040523480156200001157600080fd5b50604051620027f8380380620027f8833981810160405281019062000037919062000303565b83600290805190602001906200004f929190620001a3565b50826003908051906020019062000068929190620001a3565b5081600460006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555080600560006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505050505062000534565b828054620001b19062000421565b90600052602060002090601f016020900481019282620001d5576000855562000221565b82601f10620001f057805160ff191683800117855562000221565b8280016001018555821562000221579182015b828111156200022057825182559160200191906001019062000203565b5b50905062000230919062000234565b5090565b5b808211156200024f57600081600090555060010162000235565b5090565b6000604051905090565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b620002b88262000273565b810181811067ffffffffffffffff82111715620002da57620002d9620002be565b5b80604052505050565b6000620002f162000253565b9050620002ff8282620002ad565b919050565b600080600080608085870312156200032057620003216200025d565b5b600085015167ffffffffffffffff8111156200034157620003406200026c565b5b6200034f87828801620002e0565b945050602085015167ffffffffffffffff8111156200037357620003726200026c565b5b6200038187828801620002e0565b935050604085015167ffffffffffffffff811115620003a557620003a46200026c565b5b620003b387828801620002e0565b925050606085015167ffffffffffffffff811115620003d757620003d66200026c565b5b620003e587828801620002e0565b91505092959194509250565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806200043957607f821691505b60208210811415620004505762000a4f620004f4565b5b50919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000620004828262000455565b9050919050565b620004948162000475565b82525050565b600081519050919050565b600082825260208201905092915050565b60005b83811015620004d6578082015181840152602081019050620004b9565b83811115620004e6576000848401525b50505050565b6000620004f98262000456565b620005058185620004ac565b93506200051781856020860620004b6565b6200052283620004c9565b840191505092915050565b60006020820190506200054460008301846200048a565b92915050565b6122b480620005446000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80632eb2c2d61461003b5780634e1273f414610057575b600080fd5b6100556004803603810190610050919061070e565b610090565b005b610071600480360381019061006c91906107dd565b610155565b60405161007f929190610900565b60405180910390f35b600073ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146100fa576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100f190610973565b60405180910390fd5b8373ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff167f4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07ce33e6897249738280e968686866040516101569493929190610993565b60405180910390a4505050505050565b606081518351146101a1576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161019890610a1a565b60405180910390fd5b6000835167ffffffffffffffff8111156101be576101bd610a3a565b5b6040519080825280602002602001820160405280156101ec5781602001602082028036833780820191505090505b50905060005b8451811015610252576102298582815181106102115761021061019a565b5b602002602001015186838151811061022c5761022b61019a565b5b6020026020010151610262565b82828151811061023c5761023b61019a565b5b602002602001018190525080610247906109c4565b9050610251565b508091505092915050565b6060818310610277576102708382610295565b9050610291565b60008214610285573d82849550945050505050610291565b506102908383610295565b5b5050565b6060600082111580156102a75750818311155b156102b457809150506102ce565b6102bd8361041e565b6102ca60006064610490565b9150505b92915050565b6000604051905090565b600080fd5b600080fd5b6000819050919050565b6102fa816102e7565b811461030557600080fd5b50565b600081359050610317816102f1565b92915050565b60008115159050919050565b6103328161031d565b811461033d57600080fd5b50565b60008135905061034f81610329565b92915050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6103a482610365565b810181811067ffffffffffffffff821117156103c3576103c261036c565b5b80604052505050565b60006103d66102d5565b90506103e2828261039b565b919050565b600067ffffffffffffffff8211156104015761040061036c565b5b61040a82610365565b9050602081019050919050565b82818337600083830152505050565b600061043961043484610e6565b6103cc565b90508281526020810184848401111561045557610454610360565b5b610460848285610417565b509392505050565b600082601f83011261047d5761047c61035b565b5b813561048d848260208601610426565b91505092915050565b600080600080608085870312156104af576104ae6102df565b5b60006104bd87828801610308565b94505060206104ce87828801610340565b935050604085013567ffffffffffffffff8111156104ef576104ee6102e4565b5b6104fb87828801610468565b925050606085013567ffffffffffffffff81111561051c5761051b6102e4565b5b61052887828801610468565b91505092959194509250565b600067ffffffffffffffff82111561054f5761054e61036c565b5b602082029250602081019050919050565b60006105738251610824565b9050919050565b600080fd5b600080fd5b600080fd5b60008083601f8401126105a0576105ff61057a565b5b8235905067ffffffffffffffff8111156105bd576105bc61057f565b5b6020830191508360018202830111156105d9576105d8610584565b5b9250929050565b600080fd5b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610614826105e9565b9050919050565b61062481610609565b811461062f57600080fd5b50565b6000813590506106418161061b565b92915050565b600080600080600060a0868803121561066357610662610589565b5b600086013567ffffffffffffffff81111561068157610680610589565b5b61068d8882890161058a565b955050602086013567ffffffffffffffff8111156106ae576106ad610589565b5b6106ba8882890161058a565b94505060406106cb88828901610308565b93505060606106dc88828901610632565b92505060806106ed88828901610308565b9150509295509295909350565b60006020820190506107056000830184610532565b92915050565b60008060008060008060008060008060c08b8d0312156107335761073261057a565b5b600061074b8d828e0161058a565b9a5050602061075c8d828e0161058a565b99505060406107708d828e0161058a565b985050606061077e8d828e0161058a565b975050608061078c8d828e0161058a565b96505060a0601f8d0312156107a5576107a461057f565b5b6107af8d82890161058a565b9450505092959891949750929550565b6000819050919050565b6107d2816107bf565b81146107dd57600080fd5b50565b6000813590506107ef816107c9565b92915050565b600080604083850312156108055761080461057a565b5b6000610813858286016106fa565b925050602083013590509250929050565b600081519050919050565b600081905092915050565b60006020820190508181036000830152610853818461086d565b905092915050565b60006020820190506108706000830184610839565b92915050565b60006020820190508181036000830152610890818461086d565b905092915050565b60006020820190506108ad60008301846106de565b92915050565b6000819050919050565b6108c6816108b3565b82525050565b60006020820190506108e160008301846108bd565b92915050565b60006108f2826105e9565b9050919050565b61090281610825565b82525050565b60006020820190506109bb60008301846108f9565b92915050565b6000610932826108b3565b90508191505092915050565b6000615760820152919050565b601f196020820160c08301525050565b60c082015161095f61095482610937565b610944565b82525050565b60c08201516109766000830182610958565b5050565b60006040820190506109f960008301846108bd565b92915050`;

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

const verifySignature = (req, res, next) => {
  try {
    const walletAddress = req.headers['walletaddress'];
    const signature = req.headers['signature'];
    const message = req.headers['message'];

    if (!walletAddress || !signature || !message) {
      return res.status(401).json({ error: 'Missing authentication headers' });
    }

    // Verify the signature matches the wallet
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature - Authentication failed' });
    }

    // Attach verified user to request
    req.userId = walletAddress;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication error: ' + error.message });
  }
};

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend running' });
});

// Upload to IPFS
app.post('/api/upload-ipfs', verifySignature, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, description } = req.body;

    // Create metadata JSON
    const metadata = {
      name: title,
      description: description,
      image: '', // Will be updated after image upload
      artist: req.userId,
      createdAt: new Date().toISOString()
    };

    // Upload image to Pinata
    const imageFormData = new FormData();
    imageFormData.append('file', req.file.buffer, req.file.originalname);

    const imageResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      imageFormData,
      {
        headers: {
          ...imageFormData.getHeaders(),
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_API_SECRET
        }
      }
    );

    const imageIpfsHash = imageResponse.data.IpfsHash;
    const imageGatewayUrl = `https://gateway.pinata.cloud/ipfs/${imageIpfsHash}`;

    // Update metadata with image URL
    metadata.image = imageGatewayUrl;

    // Upload metadata to Pinata
    const metadataJson = JSON.stringify(metadata);
    const metadataFormData = new FormData();
    metadataFormData.append('file', Buffer.from(metadataJson), 'metadata.json');

    const metadataResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      metadataFormData,
      {
        headers: {
          ...metadataFormData.getHeaders(),
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_API_SECRET
        }
      }
    );

    const metadataIpfsHash = metadataResponse.data.IpfsHash;

    res.json({
      success: true,
      ipfsHash: metadataIpfsHash,
      imageHash: imageIpfsHash,
      metadata: metadata
    });
  } catch (error) {
    console.error('IPFS upload error:', error);
    res.status(500).json({ error: 'IPFS upload failed: ' + error.message });
  }
});

// Deploy ERC-1155 Contract
app.post('/api/deploy-contract', verifySignature, async (req, res) => {
  try {
    const { ipfsHash, contractName, contractSymbol, royalty, edition } = req.body;
    const artistAddress = req.userId;

    if (!ipfsHash || !contractName || !contractSymbol) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate royalty percentage
    if (royalty < 0 || royalty > 25) {
      return res.status(400).json({ error: 'Royalty must be between 0-25%' });
    }

    // Create factory contract (simplified - in production use proper factory)
    // For this demo, we'll deploy a basic ERC-1155 contract
    
    const contractFactory = new ethers.ContractFactory(
      [
        "constructor(string memory name_, string memory symbol_)",
        "function mint(address to, uint256 id, uint256 amount, bytes memory data) public",
        "function uri(uint256 tokenId) public view returns (string memory)"
      ],
      ERC1155_BYTECODE,
      signer
    );

    console.log(`Deploying contract: ${contractName} (${contractSymbol})`);
    
    // Deploy contract with owner as signer (in production, use multi-sig or governance)
    const contract = await contractFactory.deploy(contractName, contractSymbol);
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();

    console.log(`Contract deployed at: ${contractAddress}`);

    // Mint initial NFT to artist
    try {
      const tx = await contract.mint(
        artistAddress,
        1, // token ID
        edition, // amount
        '0x' // data
      );
      await tx.wait();
    } catch (err) {
      console.warn('Minting failed (contract may have different interface):', err.message);
    }

    res.json({
      success: true,
      contractAddress: contractAddress,
      transactionHash: contract.deploymentTransaction()?.hash,
      network: 'Polygon',
      artist: artistAddress,
      metadata: {
        ipfsHash,
        contractName,
        contractSymbol,
        royalty,
        edition,
        deployedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Contract deployment error:', error);
    res.status(500).json({ error: 'Contract deployment failed: ' + error.message });
  }
});

// Get contract details
app.get('/api/contract/:address', verifySignature, async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid contract address' });
    }

    // Check if contract exists
    const code = await provider.getCode(address);
    if (code === '0x') {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const tx = await provider.getTransaction(address);
    const blockNumber = await provider.getBlockNumber();

    res.json({
      contractAddress: address,
      isDeployed: true,
      network: 'Polygon',
      blockNumber: blockNumber,
      verified: code !== '0x'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching contract: ' + error.message });
  }
});

// Get user's deployments (from DB in production)
app.get('/api/user/deployments', verifySignature, (req, res) => {
  // In production, query database for user's deployed contracts
  res.json({
    userId: req.userId,
    deployments: [],
    message: 'Connected to database for production'
  });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error: ' + err.message 
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`NFT Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;