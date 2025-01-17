import { normalize } from '@aave/math-utils';
import { Trans } from '@lingui/macro';
import { Typography } from '@mui/material';
import React from 'react';
import { useStakeData } from 'src/hooks/stake-data-provider/StakeDataProvider';
import { useModalContext } from 'src/hooks/useModal';
import { useProtocolDataContext } from 'src/hooks/useProtocolDataContext';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { stakeConfig } from 'src/ui-config/stakeConfig';
import { getNetworkConfig } from 'src/utils/marketsAndNetworksConfig';

import { TxErrorView } from '../FlowCommons/Error';
import { GasEstimationError } from '../FlowCommons/GasEstimationError';
import { TxSuccessView } from '../FlowCommons/Success';
import { DetailsNumberLineWithSub, TxModalDetails } from '../FlowCommons/TxModalDetails';
import { TxModalTitle } from '../FlowCommons/TxModalTitle';
import { ChangeNetworkWarning } from '../Warnings/ChangeNetworkWarning';
import { StakeRewardClaimActions } from './StakeRewardClaimActions';

export type StakeRewardClaimProps = {
  stakeAssetName: string;
};

export enum ErrorType {
  NOT_ENOUGH_BALANCE,
}

type StakingType = 'aave' | 'bpt';

export const StakeRewardClaimModalContent = ({ stakeAssetName }: StakeRewardClaimProps) => {
  const data = useStakeData();
  const stakeData = data.stakeGeneralResult?.stakeGeneralUIData[stakeAssetName as StakingType];
  const { chainId: connectedChainId } = useWeb3Context();
  const { gasLimit, mainTxState: txState, txError } = useModalContext();
  const { currentNetworkConfig, currentChainId } = useProtocolDataContext();

  // hardcoded as all rewards will be in aave token
  const rewardsSymbol = 'AAVE';

  const amount = '-1';
  const maxAmountToClaim = normalize(
    data.stakeUserResult?.stakeUserUIData[stakeAssetName as StakingType].userIncentivesToClaim ||
      '0',
    18
  );

  // staking token usd value
  const amountInUsd =
    Number(maxAmountToClaim) *
    (Number(normalize(stakeData?.stakeTokenPriceEth || 1, 18)) /
      Number(normalize(data.stakeGeneralResult?.stakeGeneralUIData.usdPriceEth || 1, 18)));

  // error handler
  let blockingError: ErrorType | undefined = undefined;
  if (maxAmountToClaim === '0') {
    blockingError = ErrorType.NOT_ENOUGH_BALANCE;
  }

  const handleBlocked = () => {
    switch (blockingError) {
      case ErrorType.NOT_ENOUGH_BALANCE:
        return <Trans>No rewards to claim</Trans>;
      default:
        return null;
    }
  };

  // is Network mismatched
  const stakingChain =
    currentNetworkConfig.isFork && currentNetworkConfig.underlyingChainId === stakeConfig.chainId
      ? currentChainId
      : stakeConfig.chainId;
  const isWrongNetwork = connectedChainId !== stakingChain;

  const networkConfig = getNetworkConfig(stakingChain);

  if (txError && txError.blocking) {
    return <TxErrorView txError={txError} />;
  }
  if (txState.success)
    return (
      <TxSuccessView
        action={<Trans>Claimed</Trans>}
        amount={maxAmountToClaim}
        symbol={rewardsSymbol}
      />
    );

  return (
    <>
      <TxModalTitle title="Claim" symbol={rewardsSymbol} />
      {isWrongNetwork && (
        <ChangeNetworkWarning networkName={networkConfig.name} chainId={stakingChain} />
      )}
      {blockingError !== undefined && (
        <Typography variant="helperText" color="red">
          {handleBlocked()}
        </Typography>
      )}
      <TxModalDetails gasLimit={gasLimit}>
        <DetailsNumberLineWithSub
          description={<Trans>Amount</Trans>}
          symbol={rewardsSymbol}
          futureValue={maxAmountToClaim}
          futureValueUSD={amountInUsd.toString()}
        />
      </TxModalDetails>

      {txError && <GasEstimationError txError={txError} />}

      <StakeRewardClaimActions
        sx={{ mt: '48px' }}
        amountToClaim={amount}
        isWrongNetwork={isWrongNetwork}
        symbol={rewardsSymbol}
        blocked={blockingError !== undefined}
        selectedToken={stakeAssetName}
      />
    </>
  );
};
