// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

contract DonationMultiSig {
	using SafeERC20 for IERC20;

	error DistributionFailed(address to, address token, uint amount);
	error NotWorthSplitting(address token, uint value);
	error NotEnoughApprovals();
	error NewContributorCannotHaveZeroWeight(address proposedContributor);
	error AlreadyProposed(address proposedContributor);
	error AlreadyApproved(
		address proposedContributor,
		address approver
	);

	struct AddCandidate {
		bool exists;
		uint32 weight;
		uint8 approvalCount;
		mapping(address => bool) approvals;
	}

	struct RemoveCandidate {
		bool exists;
		uint8 approvalCount;
		mapping(address => bool) approvals;
	}

	mapping(address => AddCandidate) addProposals;
	mapping(address => RemoveCandidate) removeProposals;

	mapping(address => bool) public isContributor;
	address[] public contributors;
	mapping(address => uint32) public weights;
	uint public totalWeight;
	uint8 public immutable maximumApprovals;

	modifier onlyContributors() {
		require(isContributor[msg.sender], "Only contributors can make this call");
		_;
	}

	constructor(address[] memory _contributors, uint32[] memory _weights, uint8 _maximumApprovals) {
		require(
			_contributors.length == _weights.length,
			"Array length mismatch"
		);
		for (uint8 i = 0; i < _contributors.length; i++) {
			require(_weights[i] != 0, "Zero weight not allowed");
			contributors.push(_contributors[i]);
			weights[contributors[i]] = _weights[i];
			totalWeight += _weights[i];
		}

		// A proposal always has one approval so the cap should be one less than desired
		maximumApprovals = _maximumApprovals - 1;
	}

	fallback() external payable {}

	receive() external payable {}

	// Adding Contributors
	function proposeAddContributor(
		address newContributor,
		uint32 weight
	) external onlyContributors {
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
	}

	function addContributor(address newContributor) external onlyContributors {
		// If we don't have enough approvals then revert
		if (!(addProposals[newContributor].approvalCount >= _approvalMinimum())) {
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
		// addProposals[newContributor].exists = false;
		addProposals[newContributor].weight = 0;
	}

	// Removing Contributors
	function proposeRemoveContributor(address contributor) external onlyContributors {
		if (removeProposals[contributor].exists) {
			revert AlreadyProposed(contributor);
		}
		removeProposals[contributor].exists = true;
		removeProposals[contributor].approvals[msg.sender] = true;
	}

	function approveRemoveContributor(address contributor) external onlyContributors {
		if (removeProposals[contributor].approvals[msg.sender]) {
			revert AlreadyApproved(contributor, msg.sender);
		}
		removeProposals[contributor].approvals[msg.sender] = true;
	}

	function removeContributor(uint8 contributorIndex) external onlyContributors {
		address contributor = contributors[contributorIndex];
		if (!(removeProposals[contributor].approvalCount >= _approvalMinimum())) {
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
		if (contributors.length > 3) {
			// This number is set in the contructor with 1 less than the actual maximum given
			return maximumApprovals;
		} else {
			return contributors.length - 1;
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
				(bool success, ) = payable(contributors[i]).call{ value: amount }(
					""
				);
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
				IERC20(token).transfer(contributors[i], amount);
			}
		}

		
	}
}
