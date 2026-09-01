import React from "react";

interface BoxModelProps {
  margin: { top: number; right: number; bottom: number; left: number };
  border: { top: number; right: number; bottom: number; left: number };
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
}

export const BoxModel: React.FC<BoxModelProps> = ({
  margin,
  border,
  padding,
  width,
  height,
}) => {
  return (
    <div className="devtools-box-model">
      {/* Margin Box */}
      <div className="box-margin">
        <span className="box-label">margin</span>
        <span className="pos-t">{margin.top}</span>
        <span className="pos-r">{margin.right}</span>
        <span className="pos-b">{margin.bottom}</span>
        <span className="pos-l">{margin.left}</span>

        {/* Border Box */}
        <div className="box-border">
          <span className="box-label">border</span>
          <span className="pos-t">{border.top}</span>
          <span className="pos-r">{border.right}</span>
          <span className="pos-b">{border.bottom}</span>
          <span className="pos-l">{border.left}</span>

          {/* Padding Box */}
          <div className="box-padding">
            <span className="box-label">padding</span>
            <span className="pos-t">{padding.top}</span>
            <span className="pos-r">{padding.right}</span>
            <span className="pos-b">{padding.bottom}</span>
            <span className="pos-l">{padding.left}</span>

            {/* Content Box */}
            <div className="box-content">
              <span>{Math.round(width)} x {Math.round(height)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
