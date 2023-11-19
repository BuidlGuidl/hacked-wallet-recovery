// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DonationMultiSig {
	using SafeERC20 for IERC20;

	error ConstructorError();
	error OnlyContributor();
	error AlreadyContributor();
	error DistributionFailed(address to, address token, uint amount);
	error NotWorthSplitting(address token, uint value);
	error NotEnoughApprovals();
	error NewContributorCannotHaveZeroWeight(address proposedContributor);
	error AlreadyProposed(address proposedContributor);
	error AlreadyApproved(address proposedContributor, address approver);

	struct Proposal {
		bool exists;
		uint32 weight;
		uint8 approvalCount;
		mapping(address => bool) approvals;
	}

	mapping(address => Proposal) public addProposals;
	mapping(address => Proposal) public removeProposals;

	mapping(address => bool) public isContributor;
	address[] public contributors;
	mapping(address => uint32) public weights;
	uint public totalWeight;

	modifier onlyContributors() {
		if (!isContributor[msg.sender]) {
			revert OnlyContributor();
		}
		_;
	}

	constructor(address[] memory _contributors, uint32[] memory _weights) {
		if (!(_contributors.length == _weights.length)) {
			revert ConstructorError();
		}
		for (uint8 i = 0; i < _contributors.length; i++) {
			require(_weights[i] != 0, "Zero weight not allowed");
			contributors.push(_contributors[i]);
			weights[contributors[i]] = _weights[i];
			totalWeight += _weights[i];
			isContributor[_contributors[i]] = true;
		}
	}

	fallback() external payable {}

	receive() external payable {}

	// Adding Contributors
	function proposeAddContributor(
		address newContributor,
		uint32 weight
	) external onlyContributors {
		// Check if the address is already a contributor
		if (isContributor[newContributor]) {
			revert AlreadyContributor();
		}

		if (weight == 0) {
			revert NewContributorCannotHaveZeroWeight(newContributor);
		}

		if (!addProposals[newContributor].exists) {
			addProposals[newContributor].exists = true;
		} else {
			if (weight == addProposals[newContributor].weight) {
				revert AlreadyProposed(newContributor);
			}

			// If proposed weight is different, then reset all approvals
			for (uint8 i = 0; i < contributors.length; i++) {
				addProposals[newContributor].approvals[contributors[i]] = false;
			}
			addProposals[newContributor].approvalCount = 0;
		}
		addProposals[newContributor].approvals[msg.sender] = true;
		addProposals[newContributor].weight = weight;
	}

	function approveAddContributor(
		address newContributor
	) external onlyContributors {
		if (addProposals[newContributor].approvals[msg.sender]) {
			revert AlreadyApproved(newContributor, msg.sender);
		}
		addProposals[newContributor].approvals[msg.sender] = true;
		addProposals[newContributor].approvalCount++;
	}

	function addContributor(address newContributor) external onlyContributors {
		// If we don't have enough approvals then revert
		if (
			!(addProposals[newContributor].approvalCount >= _approvalMinimum())
		) {
			revert NotEnoughApprovals();
		}

		isContributor[newContributor] = true;
		contributors.push(newContributor);
		weights[newContributor] = addProposals[newContributor].weight;
		totalWeight += addProposals[newContributor].weight;

		// Remove the proposal
		for (uint8 i = 0; i < contributors.length; i++) {
			addProposals[newContributor].approvals[contributors[i]] = false;
		}
		addProposals[newContributor].weight = 0;
	}

	// Removing Contributors
	function proposeRemoveContributor(
		address contributor
	) external onlyContributors {
		if (removeProposals[contributor].exists) {
			revert AlreadyProposed(contributor);
		}
		removeProposals[contributor].exists = true;
		removeProposals[contributor].approvals[msg.sender] = true;
	}

	function approveRemoveContributor(
		address contributor
	) external onlyContributors {
		if (removeProposals[contributor].approvals[msg.sender]) {
			revert AlreadyApproved(contributor, msg.sender);
		}
		removeProposals[contributor].approvals[msg.sender] = true;
		removeProposals[contributor].approvalCount++;
	}

	function removeContributor(
		uint8 contributorIndex
	) external onlyContributors {
		address contributor = contributors[contributorIndex];
		if (
			!(removeProposals[contributor].approvalCount >= _approvalMinimum())
		) {
			revert NotEnoughApprovals();
		}
		// Set that contributors slot to the last contributors address - overwriting the address being removed
		contributors[contributorIndex] = contributors[contributors.length - 1];
		// Remove the last index which is redundant
		contributors.pop();
		// Remove from isContributor mapping
		isContributor[contributor] = false;

		// No need to remove the proposal as we will never add back a removed address
	}

	function _approvalMinimum() internal view returns (uint) {
		// The number returned is always one less than the actual number desired because every proposal has one implicit approval
		uint length = contributors.length;
		// If more than 4 contributors then we only require half of them to sign, rounding up (3/5,3/6,4/7,4/8...)
		if (length > 4) {
			// This number is set in the contructor with 1 less than the actual maximum given
			return (length % 2 == 0 ? length / 2 : (length / 2) + 1) - 1;
		} else {
			return length - 1;
		}
	}

	function distribute(address token) external onlyContributors {
		if (token == address(0)) {
			uint totalWeiToSend = address(this).balance;
			if (totalWeiToSend < totalWeight) {
				// Not enough balance, not worth splitting
				revert NotWorthSplitting(token, totalWeiToSend);
			}
			uint unitWeiToSend = totalWeiToSend / totalWeight;

			for (uint8 i = 0; i < contributors.length; i++) {
				uint amount = unitWeiToSend * weights[contributors[i]];
				(bool success, ) = payable(contributors[i]).call{
					value: amount
				}("");
				if (!success) {
					revert DistributionFailed(contributors[i], token, amount);
				}
			}
		} else {
			// ERC20 Distribution
			uint totalWeiToSend = IERC20(token).balanceOf(address(this));
			if (totalWeiToSend < totalWeight) {
				// Not enough balance, not worth splitting
				revert NotWorthSplitting(token, totalWeiToSend);
			}
			uint unitWeiToSend = totalWeiToSend / totalWeight;

			for (uint8 i = 0; i < contributors.length; i++) {
				uint amount = unitWeiToSend * weights[contributors[i]];
				bool success = IERC20(token).transfer(contributors[i], amount);
				if (!success) {
					revert DistributionFailed(contributors[i], token, amount);
				}
			}
		}
	}
}
