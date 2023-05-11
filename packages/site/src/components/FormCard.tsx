import { ReactNode } from 'react';
import styled from 'styled-components';

type FormCardProps = {
  content: {
    title?: string;
    description: ReactNode;
    button?: ReactNode;
  };
  disabled?: boolean;
  fullWidth?: boolean;
  children?: ReactNode; // Add children prop
};

const FormCardWrapper = styled.div<{ fullWidth?: boolean; disabled: boolean }>`
  /* ... */
`;

const Title = styled.h2`
  /* ... */
`;

const Description = styled.div`
  /* ... */
`;

export const FormCard = ({
  content,
  disabled = false,
  fullWidth,
  children, // Destructure children from the props
}: FormCardProps) => {
  const { title, description, button } = content;
  return (
    <FormCardWrapper fullWidth={fullWidth} disabled={disabled}>
      {title && <Title>{title}</Title>}
      <Description>{description}</Description>
      {children} {/* Render children inside the FormCardWrapper */}
      {button}
    </FormCardWrapper>
  );
};
