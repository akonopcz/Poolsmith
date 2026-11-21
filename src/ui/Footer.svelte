<!-- Always in view, so every number on screen stays labelled as an estimate. -->
<footer>
  <span>
    All numbers are estimates. Compression, metadata and fragmentation are not predictable.
  </span>
  <span class="plan-only">Poolsmith only plans. It never connects to a server.</span>
</footer>

<style>
  footer {
    height: var(--footer-height);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 24px;
    border-top: 1px solid var(--rule);
    background: var(--panel);
    font-size: 12px;
    color: var(--ink-3);
    white-space: nowrap;
    overflow: hidden;
  }

  footer span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 900px) {
    footer {
      height: auto;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 12px 16px;
      white-space: normal;
    }
  }
</style>
