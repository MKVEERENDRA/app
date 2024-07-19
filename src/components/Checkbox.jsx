import React, { useState } from "react";
import styled from "styled-components";
import { nanoid } from "nanoid";

const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.xs};
  margin-bottom: ${({ theme }) => theme.sizes.xs};
`;
const CheckboxValue = styled.input.attrs({ type: "checkbox" })``;
const CheckboxLabel = styled.label`
  font-size: ${({ theme }) => theme.sizes.xs};
  font-weight: ${({ theme }) => theme.weights.regular};
  line-height: 120%;
  color: ${({ theme }) => theme.colors.gray400};
  user-select: none;
`;

const Checkbox = ({ children }) => {
  const [id] = useState(nanoid());

  return (
    <CheckboxWrapper>
      <CheckboxValue id={id} />
      <CheckboxLabel htmlFor={id}>{children}</CheckboxLabel>
    </CheckboxWrapper>
  );
};

export default Checkbox;
