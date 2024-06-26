/**
 * NOTE: this code file was automatically migrated to TypeScript using ts-migrate and
 * may contain multiple `any` type annotations and `@ts-expect-error` directives.
 * If possible, please improve types while making changes to this file. If the type
 * annotations are already looking good, please remove this comment.
 */

import React from 'react';
import Utils from '../utils/Utils';
import { Tooltip } from '@databricks/design-system';

// Number of tags shown when cell is collapsed
export const NUM_TAGS_ON_COLLAPSED = 3;

type Props = {
  tags: any;
  onToggle?: (...args: any[]) => any;
};

type State = any;

export class CollapsibleTagsCell extends React.Component<Props, State> {
  state = {
    collapsed: true,
  };

  handleToggleCollapse = () => {
    this.setState((prevState: any) => ({
      collapsed: !prevState.collapsed,
    }));
    if (this.props.onToggle) {
      this.props.onToggle();
    }
  };

  render() {
    const visibleTags = Utils.getVisibleTagValues(this.props.tags);
    // In cases where only 1 tag would be shown on expansion,
    // we should just show the tag instead of the expansion button
    const showCellExpansion = visibleTags.length > NUM_TAGS_ON_COLLAPSED + 1;
    const tagsToDisplay =
      this.state.collapsed && showCellExpansion ? visibleTags.slice(0, NUM_TAGS_ON_COLLAPSED) : visibleTags;
    const showLess = (
      <div onClick={this.handleToggleCollapse} className="expander-text">
        Less
      </div>
    );
    const showMore = (
      <div onClick={this.handleToggleCollapse} className="expander-text">
        +{visibleTags.length - NUM_TAGS_ON_COLLAPSED} more
      </div>
    );
    return (
      <div css={styles.expandableListClassName}>
        {tagsToDisplay.map((entry) => {
          const tagName = entry[0];
          const value = entry[1];
          const tooltipContent = value === '' ? tagName : `${tagName}: ${value}`;
          return (
            <div className="tag-cell-item truncate-text single-line" key={tagName}>
              <Tooltip title={tooltipContent} placement="bottom">
                <span css={styles.overflowWithEllipsis}>
                  {value === '' ? (
                    <span className="tag-name">{tagName}</span>
                  ) : (
                    <span>
                      <span className="tag-name">{tagName}:</span>
                      <span className="metric-param-value">{value}</span>
                    </span>
                  )}
                </span>
              </Tooltip>
            </div>
          );
        })}
        {showCellExpansion ? (this.state.collapsed ? showMore : showLess) : null}
      </div>
    );
  }
}

const styles = {
  expandableListClassName: {
    '.expander-text': {
      textDecoration: 'underline',
      cursor: 'pointer',
    },
    '.tag-cell-item': {
      display: 'flex',
    },
  },

  overflowWithEllipsis: {
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    flexShrink: 1,
  },
};
