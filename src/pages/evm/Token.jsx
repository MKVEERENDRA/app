import React, { useState, useEffect, useContext, useMemo } from "react";
import { ethers } from "ethers";
import styled from "styled-components";
import { format } from "date-fns";
import toFlexible from "toflexible";

import { StoreContext } from "@mybucks/contexts/Store";
import ConfirmTransaction from "@mybucks/pages/evm/ConfirmTransaction";
import MinedTransaction from "@mybucks/pages/evm/MinedTransaction";
import { truncate } from "@mybucks/lib/utils";
import BackIcon from "@mybucks/assets/icons/back.svg";
import RefreshIcon from "@mybucks/assets/icons/refresh.svg";
import ArrowUpRightIcon from "@mybucks/assets/icons/arrow-up-right.svg";
import InfoRedIcon from "@mybucks/assets/icons/info-red.svg";
import InfoGreenIcon from "@mybucks/assets/icons/info-green.svg";

import {
  Container as BaseContainer,
  Box as BaseBox,
} from "@mybucks/components/Containers";
import Avatar from "@mybucks/components/Avatar";
import Button from "@mybucks/components/Button";
import Input from "@mybucks/components/Input";
import { Label } from "@mybucks/components/Label";
import Link from "@mybucks/components/Link";
import { H3 } from "@mybucks/components/Texts";
import media from "@mybucks/styles/media";

const Container = styled(BaseContainer)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.xl};
`;

const Box = styled(BaseBox)`
  width: 100%;
`;

const NavsWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TokenDetails = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: ${({ theme }) => theme.sizes.x3s};
`;

const LogoAndLink = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: ${({ theme }) => theme.sizes.x3s};
`;

const ContractLink = styled.a`
  position: absolute;
  top: -2px;
  left: calc(50% + 26px);
`;

const ArrowUpRight = styled.img.attrs({ src: ArrowUpRightIcon })`
  width: 16px;
`;

const TokenBalance = styled.h5`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.base};
  font-size: ${({ theme }) => theme.sizes.xl};
  font-weight: ${({ theme }) => theme.weights.regular};
  line-height: 120%;
  text-align: center;
`;

const TokenValue = styled.h6`
  font-size: ${({ theme }) => theme.sizes.base};
  font-weight: ${({ theme }) => theme.weights.highlight};
  line-height: 150%;
`;

const AmountWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.x3s};
  margin-bottom: ${({ theme }) => theme.sizes.x2l};

  input {
    margin-bottom: 0;
  }

  ${media.sm`
    margin-bottom: ${({ theme }) => theme.sizes.xl};
  `}
`;

const MaxButton = styled(Button).attrs({ $variant: "outline" })`
  font-size: ${({ theme }) => theme.sizes.sm};
  line-height: 130%;
`;

const InvalidTransfer = styled.div`
  padding: 0.25rem 0.625rem;
  border-radius: ${({ theme }) => theme.sizes.x3s};
  color: ${({ theme }) => theme.colors.error};
  border: 1px solid ${({ theme }) => theme.colors.error};
  margin-bottom: ${({ theme }) => theme.sizes.x2l};
  font-weight: ${({ theme }) => theme.weights.base};
  font-size: ${({ theme }) => theme.sizes.xs};
  line-height: 180%;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.x2s};

  ${media.sm`
    margin-bottom: ${({ theme }) => theme.sizes.xl};
  `}
`;

const EstimatedGasFee = styled(InvalidTransfer)`
  color: ${({ theme }) => theme.colors.success};
  border: 1px solid ${({ theme }) => theme.colors.success};
`;

const Submit = styled(Button)`
  width: 17rem;

  ${media.sm`
    width: 100%;
  `}
`;

const HistoryTable = styled.table`
  width: 100%;

  td {
    padding-bottom: 4px;
  }
`;

const AmountTd = styled.td`
  color: ${({ theme, $in }) =>
    $in ? theme.colors.success : theme.colors.error};
`;

const AddressTd = styled.td`
  ${media.sm`
    display: none;
  `}
`;

const AddressLinkLg = styled(Link)`
  text-decoration: none;
  ${media.md`
    display: none;
  `}
`;

const AddressLink = styled(Link)`
  text-decoration: none;
  display: none;
  ${media.md`
    display: inherit;
  `}
`;

const Token = () => {
  const [hasErrorInput, setHasErrorInput] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [txnHash, setTxnHash] = useState("");

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState(0);
  const [gasEstimation, setGasEstimation] = useState(0);
  const [gasEstimationValue, setGasEstimationValue] = useState(0);
  const [history, setHistory] = useState([]);

  const {
    account,
    selectedTokenAddress,
    selectToken,
    tokenBalances,
    fetchBalances,
    nativeTokenName,
    nativeTokenPrice,
    loading,
  } = useContext(StoreContext);
  const token = useMemo(
    () => tokenBalances.find((t) => t.contractAddress === selectedTokenAddress),
    [tokenBalances, selectedTokenAddress]
  );
  const balance = useMemo(
    () => ethers.formatUnits(token.balance, token.contractDecimals),
    [token]
  );

  useEffect(() => {
    if (!token.nativeToken) {
      account.queryTokenHistory(selectedTokenAddress).then((result) => {
        setHistory(result || []);
      });
    }
  }, []);

  useEffect(() => {
    const estimateGas = async () => {
      if (!recipient || !amount) {
        setHasErrorInput(false);
        setGasEstimation(0);
        return;
      }

      if (!ethers.isAddress(recipient) || amount < 0 || !token) {
        setHasErrorInput(true);
        setGasEstimation(0);
        return;
      }

      setHasErrorInput(false);
      const txData = await account.populateTransferToken(
        token.nativeToken ? "" : selectedTokenAddress,
        recipient,
        ethers.parseUnits(
          amount.toString(),
          token.nativeToken ? 18 : token.contractDecimals
        )
      );
      setTransaction(txData);

      try {
        const gasAmount = await account.estimateGas(txData);
        const gas = Number(
          ethers.formatUnits(account.gasPrice * gasAmount, 18)
        );
        const value = gas * nativeTokenPrice;
        setGasEstimation(gas.toFixed(6));
        setGasEstimationValue(value.toFixed(6));
      } catch (e) {
        setGasEstimation("");
        setGasEstimationValue("");
        setHasErrorInput(true);
      }
    };

    estimateGas();
  }, [recipient, amount, token]);

  const onSuccess = async (txn) => {
    setConfirming(false);
    setTransaction(null);
    setRecipient("");
    setAmount(0);
    setTxnHash(txn.hash);
  };

  if (confirming) {
    return (
      <ConfirmTransaction
        {...transaction}
        onReject={() => setConfirming(false)}
        onSuccess={onSuccess}
      />
    );
  }

  if (txnHash) {
    return (
      <MinedTransaction
        txnHash={txnHash}
        txnLink={account.linkOfTransaction(txnHash)}
        back={() => setTxnHash("")}
      />
    );
  }

  return (
    <Container>
      <NavsWrapper>
        <button onClick={() => selectToken("")}>
          <img src={BackIcon} />
        </button>

        <button onClick={fetchBalances}>
          <img src={RefreshIcon} />
        </button>
      </NavsWrapper>

      <TokenDetails>
        <LogoAndLink>
          {token.nativeToken ? (
            <Avatar
              uri={token.logoURI}
              symbol={token.contractTickerSymbol}
              fallbackColor={"#" + token.contractAddress.slice(2, 8)}
            />
          ) : (
            <a
              href={account.linkOfContract(token.contractAddress)}
              target="_blank"
            >
              <Avatar
                uri={token.logoURI}
                symbol={token.contractTickerSymbol}
                fallbackColor={"#" + token.contractAddress.slice(2, 8)}
              />
            </a>
          )}

          {!token.nativeToken && (
            <ContractLink
              href={account.linkOfContract(token.contractAddress)}
              target="_blank"
            >
              <ArrowUpRight />
            </ContractLink>
          )}
        </LogoAndLink>

        <TokenBalance>
          {loading ? "---" : Number(balance).toFixed(4)}
          &nbsp;
          {token.contractTickerSymbol}
        </TokenBalance>

        {!!token.quote && (
          <TokenValue>${Number(token.quote).toFixed(4)} USD</TokenValue>
        )}
      </TokenDetails>

      <Box>
        <H3>Send token to</H3>

        <Label htmlFor="recipient">Recipient</Label>
        <Input
          id="recipient"
          type="text"
          placeholder="Recipient address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />

        <Label htmlFor="amount">Amount</Label>
        <AmountWrapper>
          <Input
            id="amount"
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <MaxButton onClick={() => setAmount(balance)}>Max</MaxButton>
        </AmountWrapper>

        {hasErrorInput ? (
          <InvalidTransfer>
            <img src={InfoRedIcon} />
            <span>Invalid transfer</span>
          </InvalidTransfer>
        ) : gasEstimation > 0 ? (
          <EstimatedGasFee>
            <img src={InfoGreenIcon} />
            <span>
              Estimated gas fee: {gasEstimation}&nbsp; {nativeTokenName} / $
              {gasEstimationValue}
            </span>
          </EstimatedGasFee>
        ) : (
          <></>
        )}

        <Submit
          onClick={() => setConfirming(true)}
          disabled={hasErrorInput || gasEstimation === 0}
        >
          Submit
        </Submit>
      </Box>

      {history.length > 0 && (
        <Box>
          <H3>Activity</H3>

          <HistoryTable>
            <tbody>
              {history.map((item) => (
                <tr key={item.txnHash}>
                  <td>{format(item.time, "MM/dd")}</td>
                  <AddressTd>
                    <AddressLinkLg
                      href={account.linkOfAddress(
                        item.transferType === "IN"
                          ? item.fromAddress
                          : item.toAddress
                      )}
                      target="_blank"
                    >
                      {item.transferType === "IN"
                        ? item.fromAddress
                        : item.toAddress}
                    </AddressLinkLg>

                    <AddressLink
                      href={account.linkOfAddress(
                        item.transferType === "IN"
                          ? item.fromAddress
                          : item.toAddress
                      )}
                      target="_blank"
                    >
                      {truncate(
                        item.transferType === "IN"
                          ? item.fromAddress
                          : item.toAddress
                      )}
                    </AddressLink>
                  </AddressTd>
                  <AmountTd $in={item.transferType === "IN"}>
                    {item.transferType === "IN" ? "+" : "-"}&nbsp;
                    {toFlexible(
                      parseFloat(
                        ethers.formatUnits(item.amount, item.decimals)
                      ),
                      2
                    )}
                  </AmountTd>
                  <td>
                    <Link
                      href={account.linkOfTransaction(item.txnHash)}
                      target="_blank"
                    >
                      details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </HistoryTable>
        </Box>
      )}
    </Container>
  );
};

export default Token;
